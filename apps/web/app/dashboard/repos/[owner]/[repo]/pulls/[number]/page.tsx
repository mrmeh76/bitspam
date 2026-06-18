import {
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  FileWarning,
  GitCommit,
  GitPullRequest,
  History,
  ShieldAlert,
  UserRound
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import type { AnalysisHistoryItem } from "@bitspam/db";
import type { ChangedFile, FindingCategory, Verdict } from "@bitspam/shared";

import { CopyButton } from "@/components/copy-button";
import { DashboardShell } from "@/components/dashboard-shell";
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
import { requireAuth } from "@/lib/auth";
import {
  loadPullRequestDashboardData,
  type PullRequestDashboardData
} from "@/lib/dashboard";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    owner: string;
    repo: string;
    number: string;
  }>;
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

export default async function PullRequestDashboardPage({ params }: PageProps) {
  const { owner, repo, number } = await params;
  const decodedOwner = decodeURIComponent(owner);
  const decodedRepo = decodeURIComponent(repo);
  const parsedNumber = Number.parseInt(number, 10);

  if (!Number.isInteger(parsedNumber) || parsedNumber <= 0) {
    notFound();
  }

  const session = await requireAuth(`/dashboard/repos/${owner}/${repo}/pulls/${number}`);
  const data = await loadPullRequestSafely(decodedOwner, decodedRepo, parsedNumber);

  if (!data) {
    notFound();
  }

  return (
    <DashboardShell
      session={session}
      title={`${decodedOwner}/${decodedRepo} #${parsedNumber}`}
      subtitle="Pull request risk, findings, contributor history, risky files, and maintainer actions."
    >
      {"error" in data ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Pull request unavailable</AlertTitle>
          <AlertDescription>{data.error}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6">
          <div className="flex flex-wrap gap-2">
            <Button
              render={<Link href={`/dashboard/repos/${decodedOwner}/${decodedRepo}`} />}
              size="sm"
              variant="outline"
            >
              <ArrowLeft />
              Repository
            </Button>
            <Button
              render={
                <a
                  href={`https://github.com/${decodedOwner}/${decodedRepo}/pull/${parsedNumber}`}
                  rel="noreferrer"
                  target="_blank"
                />
              }
              size="sm"
              variant="outline"
            >
              <ExternalLink />
              GitHub PR
            </Button>
          </div>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="grid gap-6">
              <ScoreCard data={data} />
              <FindingsCard data={data} />
              <ChangedFilesCard files={data.changedFiles} />
            </div>
            <aside className="grid content-start gap-6">
              <ContributorCard data={data} />
              <RiskyFilesCard files={data.riskyFiles} />
              <SuggestedCommentCard body={data.detail.suggestedContributorComment ?? ""} />
              <RunHistoryCard items={data.history} owner={decodedOwner} repo={decodedRepo} />
            </aside>
          </section>
        </div>
      )}
    </DashboardShell>
  );
}

async function loadPullRequestSafely(
  owner: string,
  repo: string,
  number: number
): Promise<PullRequestDashboardData | { error: string } | undefined> {
  try {
    return await loadPullRequestDashboardData(owner, repo, number);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "BitSpam could not load this pull request."
    };
  }
}

function ScoreCard({ data }: { data: PullRequestDashboardData }) {
  const { detail } = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <GitPullRequest className="size-4" />
            {detail.pullRequest.title}
          </span>
          {detail.verdict ? (
            <Badge variant={verdictVariant(detail.verdict)}>{verdictLabel(detail.verdict)}</Badge>
          ) : (
            <Badge variant={statusVariant(detail.status)}>{detail.status}</Badge>
          )}
        </CardTitle>
        <CardDescription>{detail.summary ?? "No summary saved for this run."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Progress value={detail.score ?? 0}>
          <ProgressLabel>BitSpam score</ProgressLabel>
          <span className="ml-auto text-sm tabular-nums text-muted-foreground">
            {detail.score ?? "-"}/100
          </span>
        </Progress>
        <div className="grid gap-3 sm:grid-cols-3">
          <MiniMetric label="Findings" value={detail.findingsCount} />
          <MiniMetric label="Changed files" value={data.changedFiles.length} />
          <MiniMetric label="Saved" value={formatDate(detail.createdAt)} />
        </div>
        {detail.maintainerRecommendation ? (
          <div className="rounded-lg border border-border bg-background/35 p-3">
            <div className="text-sm font-medium">Maintainer recommendation</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {detail.maintainerRecommendation}
            </p>
          </div>
        ) : null}
        {detail.scoreBreakdown ? <ScoreBreakdown data={data} /> : null}
      </CardContent>
    </Card>
  );
}

function ScoreBreakdown({ data }: { data: PullRequestDashboardData }) {
  const breakdown = data.detail.scoreBreakdown;

  if (!breakdown) {
    return null;
  }

  const categories = scoreCategories.filter((category) => breakdown[category] > 0);
  const visibleCategories = categories.length > 0 ? categories : scoreCategories.slice(0, 4);

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {visibleCategories.map((category) => (
        <div className="rounded-lg border border-border bg-background/35 p-3" key={category}>
          <div className="text-xs text-muted-foreground">{categoryLabel(category)}</div>
          <div className="text-lg font-semibold tabular-nums">-{breakdown[category]}</div>
        </div>
      ))}
    </div>
  );
}

function FindingsCard({ data }: { data: PullRequestDashboardData }) {
  const findingsByCategory = data.detail.findings.reduce<
    Record<string, PullRequestDashboardData["detail"]["findings"]>
  >((groups, finding) => {
    groups[finding.category] = groups[finding.category] ?? [];
    groups[finding.category].push(finding);

    return groups;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="size-4" />
          Findings
        </CardTitle>
        <CardDescription>
          {data.detail.findings.length === 0
            ? "No saved findings."
            : `${data.detail.findings.length} saved finding(s).`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.detail.findings.length === 0 ? (
          <EmptyBlock>No findings were saved for this analysis run.</EmptyBlock>
        ) : (
          Object.entries(findingsByCategory).map(([category, findings]) => (
            <section className="space-y-2" key={category}>
              <div className="text-sm font-medium">{categoryLabel(category as FindingCategory)}</div>
              <div className="grid gap-2">
                {findings.map((finding) => (
                  <div className="rounded-lg border border-border bg-background/35 p-3" key={finding.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={severityVariant(finding.severity)}>{finding.severity}</Badge>
                      <span className="font-medium">{finding.title}</span>
                      <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                        -{finding.scoreImpact}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{finding.message}</p>
                    {finding.evidence.length > 0 ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {finding.evidence.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="mt-2 text-sm leading-6">{finding.recommendation}</p>
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

function ContributorCard({ data }: { data: PullRequestDashboardData }) {
  const stats = data.contributorStats;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRound className="size-4" />
          Contributor history
        </CardTitle>
        <CardDescription>{data.detail.pullRequest.authorLogin}</CardDescription>
      </CardHeader>
      <CardContent>
        {stats ? (
          <div className="grid grid-cols-2 gap-2">
            <MiniMetric label="First time" value={stats.isFirstTimeContributor ? "Yes" : "No"} />
            <MiniMetric label="Merged PRs" value={stats.priorMergedPrs} />
            <MiniMetric label="Open PRs" value={stats.priorOpenPrs} />
            <MiniMetric label="Closed unmerged" value={stats.priorClosedUnmergedPrs} />
          </div>
        ) : (
          <EmptyBlock>No contributor context was saved.</EmptyBlock>
        )}
      </CardContent>
    </Card>
  );
}

function RiskyFilesCard({ files }: { files: ChangedFile[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileWarning className="size-4" />
          Risky files
        </CardTitle>
        <CardDescription>Protected, sensitive, or unusually large changes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {files.length === 0 ? (
          <EmptyBlock>No risky files detected from saved context.</EmptyBlock>
        ) : (
          files.map((file) => (
            <div className="rounded-lg border border-border bg-background/35 p-3" key={file.filename}>
              <div className="break-all font-mono text-xs">{file.filename}</div>
              <div className="mt-2 text-sm tabular-nums text-muted-foreground">
                +{file.additions.toLocaleString()} / -{file.deletions.toLocaleString()} /{" "}
                {file.changes.toLocaleString()} changes
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function SuggestedCommentCard({ body }: { body: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>Suggested comment</span>
          {body ? <CopyButton text={body} /> : null}
        </CardTitle>
        <CardDescription>Copyable contributor response.</CardDescription>
      </CardHeader>
      <CardContent>
        {body ? (
          <Textarea className="min-h-40 resize-none" readOnly value={body} />
        ) : (
          <EmptyBlock>No suggested contributor comment was saved.</EmptyBlock>
        )}
      </CardContent>
    </Card>
  );
}

function RunHistoryCard({
  items,
  owner,
  repo
}: {
  items: AnalysisHistoryItem[];
  owner: string;
  repo: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-4" />
          Run history
        </CardTitle>
        <CardDescription>All saved runs for this PR.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {items.map((item) => (
          <Link
            className="rounded-lg border border-border bg-background/35 p-3 transition-colors hover:bg-muted/60"
            href={`/dashboard/repos/${owner}/${repo}/pulls/${item.pullRequest.number}`}
            key={item.id}
          >
            <div className="flex items-center justify-between gap-2">
              <Badge variant={item.verdict ? verdictVariant(item.verdict) : statusVariant(item.status)}>
                {item.verdict ? verdictLabel(item.verdict) : item.status}
              </Badge>
              <span className="text-sm tabular-nums text-muted-foreground">{item.score ?? "-"}/100</span>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">{formatDate(item.createdAt)}</div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function ChangedFilesCard({ files }: { files: ChangedFile[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCommit className="size-4" />
          Changed files
        </CardTitle>
        <CardDescription>{files.length} file(s) saved in the PR context.</CardDescription>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <EmptyBlock>No changed files were saved.</EmptyBlock>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Additions</TableHead>
                <TableHead className="text-right">Deletions</TableHead>
                <TableHead className="text-right">Changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.slice(0, 80).map((file) => (
                <TableRow key={file.filename}>
                  <TableCell className="max-w-[520px] whitespace-normal break-all font-mono text-xs">
                    {file.filename}
                  </TableCell>
                  <TableCell>{file.status}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {file.additions.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {file.deletions.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {file.changes.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-background/35 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function EmptyBlock({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function verdictLabel(verdict: Verdict): string {
  return verdict
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function verdictVariant(verdict: Verdict): "default" | "secondary" | "destructive" | "outline" {
  if (verdict === "review_ready") {
    return "secondary";
  }

  if (verdict === "likely_low_quality" || verdict === "high_risk") {
    return "destructive";
  }

  return "outline";
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

function statusVariant(status: AnalysisHistoryItem["status"]): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") {
    return "secondary";
  }

  if (status === "failed") {
    return "destructive";
  }

  return "outline";
}

function categoryLabel(category: FindingCategory): string {
  return category
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
