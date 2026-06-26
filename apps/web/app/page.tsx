import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  GitPullRequest,
  History,
  PlugZap,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

const productFlow = [
  {
    title: "Detect",
    body: "Score intent, scope, tests, risky paths, CI, contributor context, and maintainer burden."
  },
  {
    title: "Explain",
    body: "Turn low-signal PRs into clear findings maintainers can scan before spending review time."
  },
  {
    title: "Guide",
    body: "Give serious contributors a specific, copyable path to improve their pull request."
  },
  {
    title: "Track",
    body: "Keep saved history for repositories, pull requests, verdicts, and suggested follow-up."
  }
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
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
          <Link className="flex items-center gap-3" href="/">
            <span className="flex size-9 items-center justify-center rounded-full bg-foreground text-background">
              <ShieldCheck className="size-5" />
            </span>
            <span className="text-lg font-semibold">BitSpam</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-2">
            <Button render={<Link href="/analyze" />} size="sm" variant="ghost">
              Analyze
            </Button>
            <Button render={<Link href="/dashboard" />} size="sm" variant="ghost">
              Dashboard
            </Button>
            <Button render={<Link href="/api/github/install" />} size="sm">
              Install GitHub App
            </Button>
          </nav>
        </div>
      </header>

      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-[1600px] border-x border-border lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.58fr)]">
          <div className="flex min-h-[520px] items-center px-6 py-16 sm:px-10 lg:px-20">
            <div className="max-w-4xl">
              <div className="mb-8 flex items-center gap-2 font-mono text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Maintainer triage
                <span className="size-2 bg-primary" />
              </div>
              <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.02em] text-foreground sm:text-6xl lg:text-7xl">
                Stop spammy pull requests before they drain maintainer time.
              </h1>
              <p className="mt-8 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
                Spot low-effort PRs, explain the risk, and give contributors a
                fair path to fix their work. Advisory by default. Maintainers
                stay in control.
              </p>
            </div>
          </div>

          <aside className="border-t border-border px-6 py-10 sm:px-10 lg:border-l lg:border-t-0 lg:px-16">
            <div className="flex min-h-full flex-col justify-center">
              <div className="flex gap-2">
                <IconTile icon={<GitPullRequest />} />
                <IconTile icon={<ShieldCheck />} />
                <IconTile icon={<BarChart3 />} />
              </div>
              <p className="mt-8 text-xl leading-8 text-muted-foreground">
                BitSpam reviews pull request context, changed files, CI signal,
                repository policy, and contributor history so maintainers can
                decide what deserves attention first.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                <Button render={<Link href="/api/github/install" />} size="lg">
                  Install GitHub App
                  <ArrowRight />
                </Button>
                <Button render={<Link href="/analyze" />} size="lg" variant="outline">
                  Analyze a public PR
                </Button>
              </div>
              <Link
                className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                href="/dashboard"
              >
                Open maintainer dashboard
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto grid max-w-[1600px] border-x border-border md:grid-cols-4">
          {productFlow.map((item) => (
            <div className="border-b border-border p-6 md:border-b-0 md:border-r last:md:border-r-0 lg:p-8" key={item.title}>
              <div className="text-sm font-semibold text-foreground">{item.title}</div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1600px] gap-8 border-x border-border px-6 py-12 sm:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-20 lg:py-16">
        <div>
          <div className="font-mono text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Built for open source
          </div>
          <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.01em] sm:text-4xl">
            Keep review queues welcoming without accepting every noisy PR at face value.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureCard
            icon={<PlugZap />}
            title="GitHub App automation"
            body="Run BitSpam when pull requests open or update in installed repositories."
          />
          <FeatureCard
            icon={<GitPullRequest />}
            title="Public PR analysis"
            body="Paste a public GitHub pull request URL and get a maintainer-ready report."
          />
          <FeatureCard
            icon={<History />}
            title="Saved analysis history"
            body="Track verdicts, findings, and suggested comments across repositories."
          />
          <FeatureCard
            icon={<CheckCircle2 />}
            title="Contributor guidance"
            body="Ask for proof, issue links, tests, and repository-specific context without shutting people down."
          />
        </div>
      </section>

      <section className="border-t border-border bg-muted/35">
        <div className="mx-auto grid max-w-[1600px] gap-8 border-x border-border px-6 py-12 sm:px-10 lg:grid-cols-2 lg:px-20">
          <div>
            <h2 className="text-2xl font-semibold">Signals BitSpam watches</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              The analyzer combines deterministic checks with optional structured AI
              reasoning to surface the highest-signal review risks.
            </p>
          </div>
          <div className="grid gap-3">
            {signals.map((item) => (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3" key={item}>
                <CheckCircle2 className="size-4 shrink-0 text-primary" />
                <span className="text-sm text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function IconTile({ icon }: { icon: React.ReactNode }) {
  return (
    <span className="flex size-12 items-center justify-center rounded-lg bg-secondary text-secondary-foreground [&_svg]:size-5">
      {icon}
    </span>
  );
}

function FeatureCard({
  icon,
  title,
  body
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-primary [&_svg]:size-4">{icon}</span>
          {title}
        </CardTitle>
        <CardDescription>{body}</CardDescription>
      </CardHeader>
    </Card>
  );
}
