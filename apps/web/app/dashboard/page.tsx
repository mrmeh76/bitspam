import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Clock3,
  ExternalLink,
  GitPullRequest,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
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
import { loadDashboardData, type DashboardData, type DashboardRepository } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireAuth("/dashboard");
  const data = await loadDashboardSafely();

  return (
    <DashboardShell
      session={session}
      title="Maintainer dashboard"
      subtitle="A compact operations view for pull requests that need attention, proof, or a fast maintainer decision."
    >
      {"error" in data ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Dashboard unavailable</AlertTitle>
          <AlertDescription>{data.error}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6">
          <StatsGrid data={data} />
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
            <PullRequestQueue items={data.queue.length > 0 ? data.queue : data.recent} />
            <RepositoryList repositories={data.repositories} />
          </section>
          <RecentAnalysis items={data.recent} />
        </div>
      )}
    </DashboardShell>
  );
}

async function loadDashboardSafely(): Promise<DashboardData | { error: string }> {
  try {
    return await loadDashboardData();
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "BitSpam could not load dashboard data."
    };
  }
}

function StatsGrid({ data }: { data: DashboardData }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard icon={<BarChart3 />} label="Repositories" value={data.stats.repositories} />
      <StatCard icon={<GitPullRequest />} label="Pull requests" value={data.stats.pullRequests} />
      <StatCard icon={<Clock3 />} label="Active queue" value={data.stats.activeRuns} />
      <StatCard icon={<ShieldAlert />} label="High risk" value={data.stats.highRiskRuns} />
      <StatCard
        icon={<ShieldCheck />}
        label="Average score"
        value={data.stats.averageScore === null ? "-" : data.stats.averageScore}
      />
    </section>
  );
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

function PullRequestQueue({ items }: { items: AnalysisHistoryItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>PR queue</CardTitle>
        <CardDescription>
          {items.length === 0
            ? "No pull requests have been analyzed yet."
            : "Latest queued, processing, and recently analyzed pull requests."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState actionHref="/analyze" actionLabel="Analyze a PR" />
        ) : (
          <div className="grid gap-2">
            {items.slice(0, 8).map((item) => (
              <Link
                className="grid gap-3 rounded-lg border border-border bg-background/35 p-3 transition-colors hover:bg-muted/60 sm:grid-cols-[1fr_150px]"
                href={`/dashboard/repos/${item.repository.owner}/${item.repository.name}/pulls/${item.pullRequest.number}`}
                key={item.id}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                    {item.verdict ? (
                      <Badge variant={verdictVariant(item.verdict)}>{verdictLabel(item.verdict)}</Badge>
                    ) : null}
                  </div>
                  <div className="mt-2 truncate font-medium">
                    {item.repository.fullName} #{item.pullRequest.number}
                  </div>
                  <div className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {item.pullRequest.title}
                  </div>
                </div>
                <div className="self-center">
                  <Progress value={item.score ?? 0}>
                    <ProgressLabel>Score</ProgressLabel>
                    <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                      {item.score ?? "-"}/100
                    </span>
                  </Progress>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RepositoryList({ repositories }: { repositories: DashboardRepository[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Repositories</CardTitle>
        <CardDescription>
          {repositories.length === 0
            ? "Install BitSpam or run a public PR analysis to populate this view."
            : `${repositories.length} repository view(s).`}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {repositories.length === 0 ? (
          <EmptyState actionHref="/analyze" actionLabel="Start with a URL" />
        ) : (
          repositories.map((repository) => (
            <Link
              className="rounded-lg border border-border bg-background/35 p-3 transition-colors hover:bg-muted/60"
              href={`/dashboard/repos/${repository.owner}/${repository.repo}`}
              key={repository.fullName}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{repository.fullName}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {repository.pullRequests} PRs, {repository.runs} runs
                  </div>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <MiniMetric label="Avg" value={repository.averageScore ?? "-"} />
                <MiniMetric label="Queue" value={repository.activeRuns} />
                <MiniMetric label="Risk" value={repository.highRiskRuns} />
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function RecentAnalysis({ items }: { items: AnalysisHistoryItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analysis history</CardTitle>
        <CardDescription>Recent saved runs across every repository.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState actionHref="/history" actionLabel="Open history" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pull request</TableHead>
                <TableHead>Verdict</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Findings</TableHead>
                <TableHead>Saved</TableHead>
                <TableHead className="text-right">GitHub</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-[460px] whitespace-normal">
                    <Link
                      className="font-medium hover:underline"
                      href={`/dashboard/repos/${item.repository.owner}/${item.repository.name}/pulls/${item.pullRequest.number}`}
                    >
                      {item.repository.fullName} #{item.pullRequest.number}
                    </Link>
                    <div className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {item.pullRequest.title}
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
                  <TableCell className="text-right">
                    <Button
                      render={
                        <a
                          href={`https://github.com/${item.repository.fullName}/pull/${item.pullRequest.number}`}
                          rel="noreferrer"
                          target="_blank"
                        />
                      }
                      size="icon-sm"
                      variant="ghost"
                    >
                      <ExternalLink />
                    </Button>
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
    <div className="rounded-md bg-muted/60 px-2 py-1">
      <div>{label}</div>
      <div className="font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function EmptyState({ actionHref, actionLabel }: { actionHref: string; actionLabel: string }) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      <div>No data yet.</div>
      <Button render={<Link href={actionHref} />} size="sm" variant="outline">
        {actionLabel}
        <ArrowRight />
      </Button>
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
