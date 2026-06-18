import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Clock3,
  ExternalLink,
  GitPullRequest,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import type { AnalysisHistoryItem } from "@bitspam/db";
import type { Verdict } from "@bitspam/shared";

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
import { requireAuth } from "@/lib/auth";
import {
  loadRepositoryDashboardData,
  type RepositoryDashboardData
} from "@/lib/dashboard";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
};

export default async function RepositoryDashboardPage({ params }: PageProps) {
  const { owner, repo } = await params;
  const decodedOwner = decodeURIComponent(owner);
  const decodedRepo = decodeURIComponent(repo);
  const session = await requireAuth(`/dashboard/repos/${owner}/${repo}`);
  const data = await loadRepositorySafely(decodedOwner, decodedRepo);

  if (!data) {
    notFound();
  }

  const pageTitle = "error" in data ? `${decodedOwner}/${decodedRepo}` : data.repository.fullName;

  return (
    <DashboardShell
      session={session}
      title={pageTitle}
      subtitle="Repository-level queue, scores, verdicts, and analysis history."
    >
      {"error" in data ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Repository unavailable</AlertTitle>
          <AlertDescription>{data.error}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6">
          <div>
            <Button render={<Link href="/dashboard" />} size="sm" variant="outline">
              <ArrowLeft />
              Dashboard
            </Button>
          </div>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard icon={<GitPullRequest />} label="Pull requests" value={data.repository.pullRequests} />
            <StatCard icon={<Clock3 />} label="Active queue" value={data.repository.activeRuns} />
            <StatCard icon={<ShieldAlert />} label="High risk" value={data.repository.highRiskRuns} />
            <StatCard icon={<ShieldCheck />} label="Average score" value={data.repository.averageScore ?? "-"} />
            <StatCard icon={<ArrowRight />} label="Analysis runs" value={data.repository.runs} />
          </section>
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <PullRequestTable items={data.pulls} owner={decodedOwner} repo={decodedRepo} />
            <RepoSummary data={data} />
          </section>
          <HistoryTable items={data.history} owner={decodedOwner} repo={decodedRepo} />
        </div>
      )}
    </DashboardShell>
  );
}

async function loadRepositorySafely(
  owner: string,
  repo: string
): Promise<RepositoryDashboardData | { error: string } | undefined> {
  try {
    return await loadRepositoryDashboardData(owner, repo);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "BitSpam could not load this repository."
    };
  }
}

function StatCard({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-primary [&_svg]:size-4">
          {icon}
        </span>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold tabular-nums">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function PullRequestTable({
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
        <CardTitle>Pull requests</CardTitle>
        <CardDescription>Latest run for each pull request in this repository.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pull request</TableHead>
                <TableHead>Verdict</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Findings</TableHead>
                <TableHead>Saved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-130 whitespace-normal">
                    <Link
                      className="font-medium hover:underline"
                      href={`/dashboard/repos/${owner}/${repo}/pulls/${item.pullRequest.number}`}
                    >
                      #{item.pullRequest.number} {item.pullRequest.title}
                    </Link>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {item.pullRequest.authorLogin}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.verdict ? (
                      <Badge variant={verdictVariant(item.verdict)}>{verdictLabel(item.verdict)}</Badge>
                    ) : (
                      <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{item.score ?? "-"}</TableCell>
                  <TableCell className="text-right tabular-nums">{item.findingsCount}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(item.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function RepoSummary({ data }: { data: RepositoryDashboardData }) {
  const latest = data.repository.latestRun;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Repository signal</CardTitle>
        <CardDescription>Current posture from recent BitSpam runs.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={data.repository.averageScore ?? 0}>
          <ProgressLabel>Average score</ProgressLabel>
          <span className="ml-auto text-sm tabular-nums text-muted-foreground">
            {data.repository.averageScore ?? "-"}/100
          </span>
        </Progress>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <MiniMetric label="Queue" value={data.repository.activeRuns} />
          <MiniMetric label="Risk" value={data.repository.highRiskRuns} />
          <MiniMetric label="Runs" value={data.repository.runs} />
          <MiniMetric label="PRs" value={data.repository.pullRequests} />
        </div>
        <div className="rounded-lg border border-border bg-background/35 p-3">
          <div className="text-sm font-medium">Latest run</div>
          {latest ? (
            <div className="mt-1 text-sm text-muted-foreground">
              #{latest.pullRequest.number} saved {formatDate(latest.createdAt)}
            </div>
          ) : (
            <div className="mt-1 text-sm text-muted-foreground">
              No pull requests have been analyzed yet.
            </div>
          )}
          <Button
            className="mt-3"
            render={
              <a
                href={`https://github.com/${data.repository.fullName}`}
                rel="noreferrer"
                target="_blank"
              />
            }
            size="sm"
            variant="outline"
          >
            <ExternalLink />
            GitHub repo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryTable({
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
        <CardTitle>Analysis history</CardTitle>
        <CardDescription>All saved analysis runs for this repository.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {items.slice(0, 12).map((item) => (
            <Link
              className="grid gap-2 rounded-lg border border-border bg-background/35 p-3 transition-colors hover:bg-muted/60 sm:grid-cols-[1fr_140px_96px]"
              href={`/dashboard/repos/${owner}/${repo}/pulls/${item.pullRequest.number}`}
              key={item.id}
            >
              <div className="min-w-0">
                <div className="truncate font-medium">
                  #{item.pullRequest.number} {item.pullRequest.title}
                </div>
                <div className="text-sm text-muted-foreground">{formatDate(item.createdAt)}</div>
              </div>
              <div>
                {item.verdict ? (
                  <Badge variant={verdictVariant(item.verdict)}>{verdictLabel(item.verdict)}</Badge>
                ) : (
                  <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                )}
              </div>
              <div className="text-right text-sm tabular-nums text-muted-foreground">
                {item.score ?? "-"}/100
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-background/35 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-36 items-center justify-center rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      No pull requests have been analyzed for this repository yet.
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

function statusVariant(status: AnalysisHistoryItem["status"]): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") {
    return "secondary";
  }

  if (status === "failed") {
    return "destructive";
  }

  return "outline";
}
