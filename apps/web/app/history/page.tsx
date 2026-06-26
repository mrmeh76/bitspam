import { AlertCircle, ArrowLeft, ExternalLink, GitPullRequest, History } from "lucide-react";
import Link from "next/link";

import { listRecentAnalysisRuns } from "@bitspam/db";
import type { AnalysisHistoryItem } from "@bitspam/db";
import type { Verdict } from "@bitspam/shared";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const history = await loadHistory();

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-border bg-card px-4 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <History className="size-4 text-foreground" />
              Saved reports
            </div>
            <h1 className="text-2xl font-semibold tracking-[-0.01em] sm:text-3xl">
              Analysis history
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Review saved verdicts, findings, and maintainer recommendations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button render={<Link href="/" />} size="sm" variant="outline">
              <ArrowLeft />
              Home
            </Button>
            <Button render={<Link href="/analyze" />} size="sm" variant="outline">
              <GitPullRequest />
              Analyze
            </Button>
          </div>
        </header>

        {"error" in history ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>History unavailable</AlertTitle>
            <AlertDescription>{history.error}</AlertDescription>
          </Alert>
        ) : (
          <HistoryTable items={history.items} />
        )}
      </div>
    </main>
  );
}

function HistoryTable({ items }: { items: AnalysisHistoryItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent runs</CardTitle>
        <CardDescription>
          {items.length === 0
            ? "No analyses have been saved yet."
            : `${items.length} saved analysis run(s).`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            Saved analyses will appear here after `/analyze` completes.
          </div>
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
                  <TableCell className="max-w-130">
                    <div className="flex items-start gap-2">
                      <GitPullRequest className="mt-1 size-4 shrink-0 text-muted-foreground" />
                      <div className="space-y-1">
                        <Link className="font-medium hover:underline" href={`/history/${item.id}`}>
                          {item.repository.fullName} #{item.pullRequest.number}
                        </Link>
                        <div className="text-sm text-muted-foreground">
                          {item.pullRequest.title}
                        </div>
                        <a
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                          href={`https://github.com/${item.repository.fullName}/pull/${item.pullRequest.number}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          GitHub
                          <ExternalLink className="size-3" />
                        </a>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.verdict ? (
                      <Badge variant={verdictVariant(item.verdict)}>
                        {verdictLabel(item.verdict)}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Unknown</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.score ?? "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.findingsCount}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(item.createdAt)}
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

async function loadHistory(): Promise<
  | { items: AnalysisHistoryItem[]; error?: never }
  | { items?: never; error: string }
> {
  try {
    return { items: await listRecentAnalysisRuns(getDb(), 50) };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "BitSpam could not load saved analyses."
    };
  }
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
