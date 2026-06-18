"use client";

import type { AnalysisResult, FindingCategory, Verdict } from "@bitspam/shared";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  GitPullRequest,
  History,
  Loader2,
  ShieldAlert
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type AnalyzeResponse = {
  analysisRunId: string;
  status: "completed";
  result: AnalysisResult;
  pullRequest: PullRequestSummary;
};

type PendingAnalyzeResponse = {
  analysisRunId: string;
  status: "queued" | "processing" | "failed";
  error?: string | null;
  pullRequest: {
    owner: string;
    repo: string;
    number: number;
    title?: string;
  };
};

type AnalyzeStatusResponse = AnalyzeResponse | PendingAnalyzeResponse;

type PullRequestSummary = {
  owner: string;
  repo: string;
  number: number;
  title: string;
  authorLogin: string;
  authorAssociation?: string;
  headSha: string;
  baseSha: string;
  changedFiles: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
  }>;
  totals: {
    files: number;
    additions: number;
    deletions: number;
    changes: number;
    commits: number;
    checkRuns: number;
    comments: number;
    linkedIssues: number;
  };
  repoFiles: {
    hasReadme: boolean;
    hasContributing: boolean;
    hasPullRequestTemplate: boolean;
    hasCodeowners: boolean;
    hasBitspamConfig: boolean;
  };
  contributorStats: {
    isFirstTimeContributor: boolean;
    priorMergedPrs: number;
    priorOpenPrs: number;
    priorClosedUnmergedPrs: number;
  };
};

const scoreCategories: FindingCategory[] = [
  "intent",
  "scope",
  "tests",
  "policy",
  "risk",
  "contributor",
  "spam",
  "ci",
  "maintainer_burden"
];

export default function AnalyzePage() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [pendingAnalysis, setPendingAnalysis] = useState<PendingAnalyzeResponse | null>(null);
  const isAnalysisRunning = isLoading || Boolean(pendingAnalysis);

  useEffect(() => {
    if (!pendingAnalysis || pendingAnalysis.status === "failed") {
      return;
    }

    let cancelled = false;
    const analysisRunId = pendingAnalysis.analysisRunId;

    async function pollStatus() {
      try {
        const response = await fetch(`/api/analyze/${analysisRunId}`, {
          cache: "no-store"
        });
        const payload = (await response.json()) as AnalyzeStatusResponse | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in payload && payload.error
              ? payload.error
              : "Could not load analysis status."
          );
        }

        if (cancelled || !("status" in payload)) {
          return;
        }

        if (payload.status === "completed") {
          setAnalysis(payload);
          setPendingAnalysis(null);
          setError(null);
          return;
        }

        if (payload.status === "failed") {
          setError(payload.error ?? "Analysis failed.");
          setPendingAnalysis(null);
          return;
        }

        setPendingAnalysis(payload);
      } catch (caughtError) {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not load analysis status."
          );
        }
      }
    }

    const firstPoll = window.setTimeout(() => void pollStatus(), 800);
    const interval = window.setInterval(() => void pollStatus(), 2500);

    return () => {
      cancelled = true;
      window.clearTimeout(firstPoll);
      window.clearInterval(interval);
    };
  }, [pendingAnalysis]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setPendingAnalysis(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url })
      });
      const payload = (await response.json()) as AnalyzeStatusResponse | { error?: string };

      if (!response.ok) {
        throw new Error("error" in payload && payload.error ? payload.error : "Analysis failed.");
      }

      if ("status" in payload && payload.status === "completed") {
        setAnalysis(payload);
        return;
      }

      setPendingAnalysis(payload as PendingAnalyzeResponse);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Analysis failed.");
      setAnalysis(null);
      setPendingAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <GitPullRequest className="size-4 text-foreground" />
              BitSpam
            </div>
            <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
              Pull request analysis
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button render={<Link href="/history" />} size="sm" variant="outline">
              <History />
              History
            </Button>
            <Badge variant="outline">Public GitHub PRs</Badge>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analyze</CardTitle>
                <CardDescription>Paste a public GitHub pull request URL.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={onSubmit}>
                  <Input
                    aria-label="GitHub pull request URL"
                    placeholder="https://github.com/owner/repo/pull/123"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                  />
                  <Button className="w-full" disabled={isAnalysisRunning || !url.trim()} type="submit">
                    {isAnalysisRunning ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Queued
                      </>
                    ) : (
                      <>
                        <ShieldAlert />
                        Run BitSpam
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {error ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>Analysis failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {analysis ? (
              <PullRequestFacts pullRequest={analysis.pullRequest} />
            ) : pendingAnalysis ? (
              <PendingAnalysis analysis={pendingAnalysis} />
            ) : (
              <EmptyState />
            )}
          </div>

          <div className="space-y-6">
            {analysis ? (
              <AnalysisReport analysis={analysis} />
            ) : pendingAnalysis ? (
              <PendingReport analysis={pendingAnalysis} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Report</CardTitle>
                  <CardDescription>No analysis has been run in this session.</CardDescription>
                </CardHeader>
                <CardContent className="flex min-h-72 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  Results will appear here.
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ready</CardTitle>
        <CardDescription>BitSpam will fetch public metadata only.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm text-muted-foreground">
        <div>PR metadata, files, commits, checks, and repository guidance.</div>
        <div>No contributor code is executed.</div>
      </CardContent>
    </Card>
  );
}

function PendingAnalysis({ analysis }: { analysis: PendingAnalyzeResponse }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          Analysis {analysis.status}
        </CardTitle>
        <CardDescription>
          {analysis.pullRequest.owner}/{analysis.pullRequest.repo} #{analysis.pullRequest.number}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm text-muted-foreground">
        <div>BitSpam queued this pull request for worker processing.</div>
        <div>The report will appear here automatically when the worker saves it.</div>
      </CardContent>
    </Card>
  );
}

function PendingReport({ analysis }: { analysis: PendingAnalyzeResponse }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Report</CardTitle>
        <CardDescription>Analysis run {analysis.analysisRunId}</CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-foreground" />
        <div>
          {analysis.status === "queued"
            ? "Waiting for a worker."
            : "Worker is analyzing the PR."}
        </div>
      </CardContent>
    </Card>
  );
}

function PullRequestFacts({ pullRequest }: { pullRequest: PullRequestSummary }) {
  const prUrl = `https://github.com/${pullRequest.owner}/${pullRequest.repo}/pull/${pullRequest.number}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitPullRequest className="size-4" />
          PR #{pullRequest.number}
        </CardTitle>
        <CardDescription>{pullRequest.owner}/{pullRequest.repo}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <a
            className="inline-flex items-start gap-1 font-medium hover:underline"
            href={prUrl}
            rel="noreferrer"
            target="_blank"
          >
            <span>{pullRequest.title}</span>
            <ExternalLink className="mt-0.5 size-3.5 shrink-0" />
          </a>
          <div className="text-sm text-muted-foreground">
            {pullRequest.authorLogin}
            {pullRequest.authorAssociation ? ` - ${pullRequest.authorAssociation}` : ""}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <Fact label="Files" value={pullRequest.totals.files} />
          <Fact label="Changes" value={pullRequest.totals.changes} />
          <Fact label="Commits" value={pullRequest.totals.commits} />
          <Fact label="Checks" value={pullRequest.totals.checkRuns} />
        </div>

        <div className="flex flex-wrap gap-2">
          <RepoFileBadge active={pullRequest.repoFiles.hasReadme} label="README" />
          <RepoFileBadge active={pullRequest.repoFiles.hasContributing} label="CONTRIBUTING" />
          <RepoFileBadge active={pullRequest.repoFiles.hasPullRequestTemplate} label="PR template" />
          <RepoFileBadge active={pullRequest.repoFiles.hasCodeowners} label="CODEOWNERS" />
          <RepoFileBadge active={pullRequest.repoFiles.hasBitspamConfig} label=".bitspam.yml" />
        </div>
      </CardContent>
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}

function RepoFileBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <Badge variant={active ? "secondary" : "outline"}>
      {active ? <CheckCircle2 className="size-3" /> : null}
      {label}
    </Badge>
  );
}

function AnalysisReport({ analysis }: { analysis: AnalyzeResponse }) {
  const { result, pullRequest } = analysis;
  const verdict = verdictLabel(result.verdict);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>Score</span>
            <Badge variant={verdict.variant}>{verdict.label}</Badge>
          </CardTitle>
          <CardDescription>{result.summary}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Button render={<Link href={`/history/${analysis.analysisRunId}`} />} size="sm" variant="outline">
            <History />
            View saved run
          </Button>
          <Progress value={result.score}>
            <ProgressLabel>BitSpam score</ProgressLabel>
            <span className="ml-auto text-sm text-muted-foreground tabular-nums">
              {result.score}/100
            </span>
          </Progress>
          <div className="grid gap-3 md:grid-cols-2">
            <Recommendation title="Maintainer" body={result.maintainerRecommendation} />
            <Recommendation title="Contributor" body={result.suggestedContributorComment} copyable />
          </div>
        </CardContent>
      </Card>

      <ScoreBreakdown result={result} />
      <Findings result={result} />
      <ChangedFiles pullRequest={pullRequest} />
    </>
  );
}

function Recommendation({
  title,
  body,
  copyable = false
}: {
  title: string;
  body: string;
  copyable?: boolean;
}) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">{title}</div>
        {copyable ? (
          <Button
            aria-label="Copy suggested contributor comment"
            size="icon-sm"
            type="button"
            variant="ghost"
            onClick={() => void navigator.clipboard.writeText(body)}
          >
            <Copy />
          </Button>
        ) : null}
      </div>
      <Textarea className="min-h-24 resize-none" readOnly value={body} />
    </div>
  );
}

function ScoreBreakdown({ result }: { result: AnalysisResult }) {
  const nonZeroCategories = scoreCategories.filter(
    (category) => result.scoreBreakdown[category] > 0
  );
  const categories = nonZeroCategories.length > 0 ? nonZeroCategories : scoreCategories.slice(0, 4);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Score breakdown</CardTitle>
        <CardDescription>Points lost by category.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => (
          <div className="rounded-lg border p-3" key={category}>
            <div className="text-xs text-muted-foreground">{categoryLabel(category)}</div>
            <div className="text-lg font-semibold tabular-nums">
              -{result.scoreBreakdown[category]}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Findings({ result }: { result: AnalysisResult }) {
  const findingsByCategory = result.findings.reduce<Record<string, typeof result.findings>>(
    (groups, finding) => {
      groups[finding.category] = groups[finding.category] ?? [];
      groups[finding.category].push(finding);

      return groups;
    },
    {}
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Findings</CardTitle>
        <CardDescription>
          {result.findings.length === 0 ? "No deterministic findings." : `${result.findings.length} finding(s).`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {result.findings.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            BitSpam did not find obvious maintainer-burden signals.
          </div>
        ) : (
          Object.entries(findingsByCategory).map(([category, findings]) => (
            <section className="space-y-2" key={category}>
              <div className="text-sm font-medium">{categoryLabel(category as FindingCategory)}</div>
              <div className="grid gap-2">
                {findings.map((finding) => (
                  <div className="rounded-lg border p-3" key={finding.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={severityVariant(finding.severity)}>
                        {finding.severity}
                      </Badge>
                      <span className="font-medium">{finding.title}</span>
                      <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                        -{finding.scoreImpact}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{finding.message}</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {finding.evidence.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-sm">{finding.recommendation}</p>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ChangedFiles({ pullRequest }: { pullRequest: PullRequestSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-4" />
          Changed files
        </CardTitle>
        <CardDescription>
          +{pullRequest.totals.additions.toLocaleString()} / -
          {pullRequest.totals.deletions.toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Changes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pullRequest.changedFiles.slice(0, 40).map((file) => (
              <TableRow key={file.filename}>
                <TableCell className="max-w-[520px] whitespace-normal break-all font-mono text-xs">
                  {file.filename}
                </TableCell>
                <TableCell>{file.status}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {file.changes.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {pullRequest.changedFiles.length > 40 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Showing 40 of {pullRequest.changedFiles.length.toLocaleString()} files.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function verdictLabel(verdict: Verdict): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  switch (verdict) {
    case "review_ready":
      return { label: "Review ready", variant: "secondary" };
    case "needs_small_fixes":
      return { label: "Needs small fixes", variant: "outline" };
    case "needs_proof_of_work":
      return { label: "Needs proof of work", variant: "outline" };
    case "likely_low_quality":
      return { label: "Likely low quality", variant: "destructive" };
    case "high_risk":
      return { label: "High risk", variant: "destructive" };
  }
}

function severityVariant(severity: string): "default" | "secondary" | "destructive" | "outline" {
  if (severity === "high" || severity === "critical") {
    return "destructive";
  }

  if (severity === "medium") {
    return "outline";
  }

  return "secondary";
}

function categoryLabel(category: FindingCategory): string {
  return category
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
