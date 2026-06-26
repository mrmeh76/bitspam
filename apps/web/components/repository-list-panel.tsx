"use client";

import { ArrowRight, Check, ChevronDown, LockKeyhole, PlugZap } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { DashboardRepository } from "@/lib/dashboard";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

type RepositoryView = "all" | "installed" | "analyzed";

export function RepositoryListPanel({
  repositories
}: {
  repositories: DashboardRepository[];
}) {
  const [view, setView] = useState<RepositoryView>("all");
  const visibleRepositories = useMemo(
    () => filterRepositories(repositories, view),
    [repositories, view]
  );

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Repositories</CardTitle>
            <CardDescription>
              {repositories.length === 0
                ? "Install BitSpam or run a public PR analysis to populate this view."
                : `${visibleRepositories.length} of ${repositories.length} repository view(s).`}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <RepositoryViewMenu onChange={setView} view={view} />
            <Button render={<Link href="/api/github/install" />} size="sm" variant="outline">
              <PlugZap />
              Manage repos
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {visibleRepositories.length === 0 ? (
          <EmptyRepositoryState />
        ) : (
          <div className="bitspam-scrollbar grid max-h-[360px] gap-2 overflow-y-auto pr-1.5">
            {visibleRepositories.map((repository) => (
              <RepositoryCard key={repository.fullName} repository={repository} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RepositoryViewMenu({
  view,
  onChange
}: {
  view: RepositoryView;
  onChange: (view: RepositoryView) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnOutsideClick(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);

    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  function handleChange(nextView: RepositoryView) {
    onChange(nextView);
    setOpen(false);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-border bg-card px-2.5 text-[0.8rem] font-medium shadow-sm transition-colors hover:bg-muted"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {repositoryViewLabel(view)}
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 grid w-48 gap-1 rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-md">
          <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
            Repository view
          </div>
          <RepositoryViewOption currentView={view} label="All repositories" onChange={handleChange} value="all" />
          <RepositoryViewOption currentView={view} label="Installed only" onChange={handleChange} value="installed" />
          <RepositoryViewOption currentView={view} label="Analyzed only" onChange={handleChange} value="analyzed" />
          <div className="my-1 h-px bg-border" />
          <Link
            className="rounded-md px-1.5 py-1 hover:bg-accent hover:text-accent-foreground"
            href="/api/github/install"
          >
            Change repositories
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function RepositoryViewOption({
  currentView,
  label,
  onChange,
  value
}: {
  currentView: RepositoryView;
  label: string;
  onChange: (view: RepositoryView) => void;
  value: RepositoryView;
}) {
  const active = currentView === value;

  return (
    <button
      className={`flex items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "hover:bg-accent hover:text-accent-foreground"
      }`}
      onClick={() => onChange(value)}
      type="button"
    >
      <span className="flex-1">{label}</span>
      {active ? <Check className="size-3.5" /> : null}
    </button>
  );
}

function RepositoryCard({ repository }: { repository: DashboardRepository }) {
  const hasAnalysis = repository.runs > 0;
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium">{repository.fullName}</span>
            {repository.isPrivate ? (
              <Badge variant="outline">
                <LockKeyhole />
                private
              </Badge>
            ) : null}
            <Badge variant={repository.source === "installed" ? "secondary" : "outline"}>
              {repository.source === "installed" ? "installed" : "analyzed"}
            </Badge>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {hasAnalysis
              ? `${repository.pullRequests} PRs, ${repository.runs} runs`
              : "No PR checks yet."}
          </div>
        </div>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
      </div>
      {hasAnalysis ? (
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <MiniMetric label="Avg" value={repository.averageScore ?? "-"} />
          <MiniMetric label="Queue" value={repository.activeRuns} />
          <MiniMetric label="Risk" value={repository.highRiskRuns} />
        </div>
      ) : null}
    </>
  );

  if (!hasAnalysis) {
    return (
      <a
        className="block rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted"
        href={`https://github.com/${repository.fullName}`}
        rel="noreferrer"
        target="_blank"
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      className="rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted"
      href={`/dashboard/repos/${repository.owner}/${repository.repo}`}
    >
      {content}
    </Link>
  );
}

function EmptyRepositoryState() {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      <div>No repositories in this view.</div>
      <Button render={<Link href="/api/github/install" />} size="sm" variant="outline">
        Change repositories
        <ArrowRight />
      </Button>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-muted/50 px-2 py-1">
      <div>{label}</div>
      <div className="font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function filterRepositories(
  repositories: DashboardRepository[],
  view: RepositoryView
): DashboardRepository[] {
  if (view === "installed") {
    return repositories.filter((repository) => repository.source === "installed");
  }

  if (view === "analyzed") {
    return repositories.filter((repository) => repository.runs > 0);
  }

  return repositories;
}

function repositoryViewLabel(view: RepositoryView): string {
  if (view === "installed") {
    return "Installed only";
  }

  if (view === "analyzed") {
    return "Analyzed only";
  }

  return "All repositories";
}
