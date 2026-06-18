import { ArrowLeft, ExternalLink, GitPullRequest, History } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAnalysisRunDetail } from "@bitspam/db";
import type { AnalysisRunDetail } from "@bitspam/db";
import type { FindingCategory, Verdict } from "@bitspam/shared";

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
import { Textarea } from "@/components/ui/textarea";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
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

export default async function HistoryDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getAnalysisRunDetail(getDb(), id);

  if (!detail) {
    notFound();
  }

  const verdict = detail.verdict ? verdictLabel(detail.verdict) : "Unknown";

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <History className="size-4 text-foreground" />
              BitSpam
            </div>
            <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
              Saved analysis
            </h1>
          </div>
          <Button render={<Link href="/history" />} size="sm" variant="outline">
            <ArrowLeft />
            History
          </Button>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitPullRequest className="size-4" />
                  PR #{detail.pullRequest.number}
                </CardTitle>
                <CardDescription>{detail.repository.fullName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <a
                    className="inline-flex items-start gap-1 font-medium hover:underline"
                    href={`https://github.com/${detail.repository.fullName}/pull/${detail.pullRequest.number}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span>{detail.pullRequest.title}</span>
                    <ExternalLink className="mt-0.5 size-3.5 shrink-0" />
                  </a>
                  <div className="text-sm text-muted-foreground">
                    {detail.pullRequest.authorLogin}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Fact label="Findings" value={detail.findingsCount} />
                  <Fact label="Score" value={detail.score ?? 0} />
                </div>
                <div className="text-sm text-muted-foreground">
                  Saved {formatDate(detail.createdAt)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <span>Score</span>
                  <Badge variant={detail.verdict ? verdictVariant(detail.verdict) : "outline"}>
                    {verdict}
                  </Badge>
                </CardTitle>
                <CardDescription>{detail.summary}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <Progress value={detail.score ?? 0}>
                  <ProgressLabel>BitSpam score</ProgressLabel>
                  <span className="ml-auto text-sm text-muted-foreground tabular-nums">
                    {detail.score ?? 0}/100
                  </span>
                </Progress>
                <div className="grid gap-3 md:grid-cols-2">
                  <Recommendation title="Maintainer" body={detail.maintainerRecommendation ?? ""} />
                  <Recommendation title="Contributor" body={detail.suggestedContributorComment ?? ""} />
                </div>
              </CardContent>
            </Card>

            {detail.scoreBreakdown ? <ScoreBreakdown detail={detail} /> : null}
            <Findings detail={detail} />
          </div>
        </section>
      </div>
    </main>
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

function Recommendation({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="text-sm font-medium">{title}</div>
      <Textarea className="min-h-24 resize-none" readOnly value={body} />
    </div>
  );
}

function ScoreBreakdown({ detail }: { detail: AnalysisRunDetail }) {
  const scoreBreakdown = detail.scoreBreakdown;

  if (!scoreBreakdown) {
    return null;
  }

  const nonZeroCategories = scoreCategories.filter((category) => scoreBreakdown[category] > 0);
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
              -{scoreBreakdown[category]}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Findings({ detail }: { detail: AnalysisRunDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Findings</CardTitle>
        <CardDescription>
          {detail.findings.length === 0
            ? "No findings were saved."
            : `${detail.findings.length} saved finding(s).`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {detail.findings.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            BitSpam did not save findings for this run.
          </div>
        ) : (
          detail.findings.map((finding) => (
            <div className="rounded-lg border p-3" key={finding.id}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={severityVariant(finding.severity)}>{finding.severity}</Badge>
                <span className="font-medium">{finding.title}</span>
                <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                  -{finding.scoreImpact}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{finding.message}</p>
              <p className="mt-2 text-sm">{finding.recommendation}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
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

function categoryLabel(category: FindingCategory): string {
  return category
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
