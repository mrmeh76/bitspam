import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  GitPullRequest,
  History,
  LockKeyhole,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

const workflow = [
  "Paste a public PR URL or install the GitHub App",
  "BitSpam inspects intent, scope, tests, risky files, CI, and contributor history",
  "Maintainers get a score, verdict, findings, and a contributor-ready response"
];

const signals = [
  "Generic or mismatched PR descriptions",
  "Large unrelated diffs and risky paths",
  "Missing issue links or test evidence",
  "Failed checks and maintainer-burden patterns"
];

export default function Home() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-sidebar/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-2" href="/">
            <span className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <ShieldCheck className="size-4" />
            </span>
            <span className="font-semibold">BitSpam</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button render={<Link href="/analyze" />} size="sm" variant="outline">
              <GitPullRequest />
              Analyze
            </Button>
            <Button render={<Link href="/dashboard" />} size="sm">
              <GitPullRequest />
              Dashboard
            </Button>
          </nav>
        </div>
      </header>

      <section className="border-b border-border">
        <div className="mx-auto grid min-h-[calc(100dvh-65px)] max-w-7xl content-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
          <div className="max-w-3xl space-y-7">
            <Badge variant="secondary">
              <Sparkles className="size-3" />
              Maintainer attention firewall
            </Badge>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-6xl">
                Keep noisy pull requests out of your review queue.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                BitSpam is a GitHub App and web dashboard that flags spammy,
                low-effort, or risky pull requests while giving serious new
                contributors a fair path to improve their work.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button render={<Link href="/analyze" />} size="lg">
                Analyze a public PR
                <ArrowRight />
              </Button>
              <Button render={<Link href="/dashboard" />} size="lg" variant="outline">
                Open maintainer console
                <BarChart3 />
              </Button>
            </div>
          </div>

          <aside className="grid gap-3 self-end">
            <Metric label="Average triage target" value="< 30s" />
            <Metric label="Automation mode" value="GitHub App" />
            <Metric label="Review posture" value="Advisory" />
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitPullRequest className="size-4 text-primary" />
              Public PR analysis
            </CardTitle>
            <CardDescription>
              Paste a GitHub pull request URL and get a synchronous demo report
              backed by the same analyzer used by workers.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LockKeyhole className="size-4 text-secondary-foreground" />
              Private repo ready
            </CardTitle>
            <CardDescription>
              Private repositories are handled through GitHub App installation
              access and the authenticated maintainer dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="size-4 text-accent" />
              Saved history
            </CardTitle>
            <CardDescription>
              Every completed run can be persisted for repo-level history,
              dashboard views, and follow-up maintainer action.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      <section className="border-t border-border bg-card/40">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-2xl font-semibold">How it works</h2>
            <div className="mt-5 grid gap-3">
              {workflow.map((item, index) => (
                <div className="flex items-start gap-3 rounded-lg border border-border bg-background/45 p-3" key={item}>
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <span className="text-sm text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Signals BitSpam watches</h2>
            <div className="mt-5 grid gap-3">
              {signals.map((item) => (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-background/45 p-3" key={item}>
                  <CheckCircle2 className="size-4 shrink-0 text-accent" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="bg-card/80">
      <CardContent className="flex items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
