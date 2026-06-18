import {
  getAnalysisRunDetail,
  listRecentAnalysisRuns,
  type AnalysisHistoryItem,
  type AnalysisRunDetail
} from "@bitspam/db";
import type { ChangedFile, ContributorStats, PullRequestContext } from "@bitspam/shared";

import { getDb } from "@/lib/db";

export type DashboardRepository = {
  owner: string;
  repo: string;
  fullName: string;
  runs: number;
  activeRuns: number;
  pullRequests: number;
  averageScore: number | null;
  highRiskRuns: number;
  latestRun: AnalysisHistoryItem;
};

export type DashboardData = {
  repositories: DashboardRepository[];
  queue: AnalysisHistoryItem[];
  recent: AnalysisHistoryItem[];
  stats: {
    repositories: number;
    pullRequests: number;
    activeRuns: number;
    highRiskRuns: number;
    averageScore: number | null;
  };
};

export type RepositoryDashboardData = {
  repository: DashboardRepository;
  pulls: AnalysisHistoryItem[];
  history: AnalysisHistoryItem[];
};

export type PullRequestDashboardData = {
  detail: AnalysisRunDetail;
  history: AnalysisHistoryItem[];
  riskyFiles: ChangedFile[];
  contributorStats: ContributorStats | null;
  changedFiles: ChangedFile[];
};

export async function loadDashboardData(): Promise<DashboardData> {
  const recent = await listRecentAnalysisRuns(getDb(), 200);
  const repositories = buildRepositories(recent);
  const queue = recent.filter((item) => item.status === "queued" || item.status === "processing");
  const pullRequests = new Set(
    recent.map((item) => `${item.repository.fullName}#${item.pullRequest.number}`)
  );
  const completedScores = recent
    .map((item) => item.score)
    .filter((score): score is number => typeof score === "number");

  return {
    repositories,
    queue,
    recent: recent.slice(0, 12),
    stats: {
      repositories: repositories.length,
      pullRequests: pullRequests.size,
      activeRuns: queue.length,
      highRiskRuns: recent.filter(isHighRisk).length,
      averageScore: average(completedScores)
    }
  };
}

export async function loadRepositoryDashboardData(
  owner: string,
  repo: string
): Promise<RepositoryDashboardData | undefined> {
  const recent = await listRecentAnalysisRuns(getDb(), 300);
  const history = recent.filter(
    (item) => item.repository.owner === owner && item.repository.name === repo
  );

  if (history.length === 0) {
    return undefined;
  }

  const [repository] = buildRepositories(history);

  if (!repository) {
    return undefined;
  }

  return {
    repository,
    pulls: latestRunsByPullRequest(history),
    history
  };
}

export async function loadPullRequestDashboardData(
  owner: string,
  repo: string,
  number: number
): Promise<PullRequestDashboardData | undefined> {
  const recent = await listRecentAnalysisRuns(getDb(), 300);
  const history = recent.filter(
    (item) =>
      item.repository.owner === owner &&
      item.repository.name === repo &&
      item.pullRequest.number === number
  );
  const latest = history[0];

  if (!latest) {
    return undefined;
  }

  const detail = await getAnalysisRunDetail(getDb(), latest.id);

  if (!detail) {
    return undefined;
  }

  const context = parsePullRequestContext(detail.rawInput);
  const changedFiles = context?.changedFiles ?? [];

  return {
    detail,
    history,
    riskyFiles: riskyFilesFromContext(context),
    contributorStats: context?.contributorStats ?? null,
    changedFiles
  };
}

function buildRepositories(items: AnalysisHistoryItem[]): DashboardRepository[] {
  const groups = new Map<string, AnalysisHistoryItem[]>();

  for (const item of items) {
    const group = groups.get(item.repository.fullName) ?? [];
    group.push(item);
    groups.set(item.repository.fullName, group);
  }

  return [...groups.values()]
    .map((runs) => {
      const latestRun = runs[0]!;
      const scores = runs
        .map((item) => item.score)
        .filter((score): score is number => typeof score === "number");
      const pulls = new Set(runs.map((item) => item.pullRequest.number));

      return {
        owner: latestRun.repository.owner,
        repo: latestRun.repository.name,
        fullName: latestRun.repository.fullName,
        runs: runs.length,
        activeRuns: runs.filter(
          (item) => item.status === "queued" || item.status === "processing"
        ).length,
        pullRequests: pulls.size,
        averageScore: average(scores),
        highRiskRuns: runs.filter(isHighRisk).length,
        latestRun
      };
    })
    .sort((a, b) => b.latestRun.createdAt.getTime() - a.latestRun.createdAt.getTime());
}

function latestRunsByPullRequest(items: AnalysisHistoryItem[]): AnalysisHistoryItem[] {
  const latest = new Map<string, AnalysisHistoryItem>();

  for (const item of items) {
    const key = String(item.pullRequest.number);
    if (!latest.has(key)) {
      latest.set(key, item);
    }
  }

  return [...latest.values()];
}

function parsePullRequestContext(
  rawInput: Record<string, unknown> | null
): PullRequestContext | undefined {
  if (!rawInput || !Array.isArray(rawInput.changedFiles)) {
    return undefined;
  }

  return rawInput as PullRequestContext;
}

function riskyFilesFromContext(context: PullRequestContext | undefined): ChangedFile[] {
  if (!context) {
    return [];
  }

  return context.changedFiles
    .filter((file) => isRiskyFile(file.filename) || file.changes >= 200)
    .sort((a, b) => b.changes - a.changes)
    .slice(0, 12);
}

function isRiskyFile(filename: string): boolean {
  return [
    ".github/workflows/",
    "package.json",
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
    "auth/",
    "security/",
    "crypto/",
    "wallet/",
    "consensus/"
  ].some((pattern) => filename.includes(pattern));
}

function isHighRisk(item: AnalysisHistoryItem): boolean {
  return item.verdict === "likely_low_quality" || item.verdict === "high_risk";
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
