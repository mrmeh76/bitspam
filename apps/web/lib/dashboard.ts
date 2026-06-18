import {
  getAnalysisRunDetail,
  listTrackedRepositories,
  listRecentAnalysisRuns,
  type AnalysisHistoryItem,
  type AnalysisRunDetail,
  type TrackedRepository
} from "@bitspam/db";
import type { ChangedFile, ContributorStats, PullRequestContext } from "@bitspam/shared";

import type { AuthSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  listGitHubUserAppRepositories,
  type GitHubUserRepository
} from "@/lib/github-user";

export type DashboardRepository = {
  owner: string;
  repo: string;
  fullName: string;
  runs: number;
  activeRuns: number;
  pullRequests: number;
  averageScore: number | null;
  highRiskRuns: number;
  isPrivate: boolean;
  source: "installed" | "analyzed";
  installationAccountLogin: string | null;
  latestRun: AnalysisHistoryItem | null;
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

export async function loadDashboardData(session?: AuthSession): Promise<DashboardData> {
  const recent = await listRecentAnalysisRuns(getDb(), 200);
  const repositories = await buildRepositories(recent, session);
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

  const [repository] = await buildRepositories(history);

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

async function buildRepositories(
  items: AnalysisHistoryItem[],
  session?: AuthSession
): Promise<DashboardRepository[]> {
  const groups = new Map<string, AnalysisHistoryItem[]>();

  for (const item of items) {
    const group = groups.get(item.repository.fullName) ?? [];
    group.push(item);
    groups.set(item.repository.fullName, group);
  }

  const analyzed = [...groups.values()]
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
        isPrivate: false,
        source: "analyzed" as const,
        installationAccountLogin: null,
        latestRun
      };
    })
    .sort((a, b) => b.latestRun.createdAt.getTime() - a.latestRun.createdAt.getTime());

  const installed = session ? await listInstalledRepositories(session) : [];

  return mergeRepositories(installed, analyzed);
}

async function listInstalledRepositories(
  session: AuthSession
): Promise<DashboardRepository[]> {
  if (session.accessToken) {
    try {
      return repositoriesFromGitHub(await listGitHubUserAppRepositories(session.accessToken));
    } catch {
      // Fall back to webhook-saved repositories below.
    }
  }

  return repositoriesFromTracked(await listTrackedRepositories(getDb(), 200));
}

function repositoriesFromGitHub(repositories: GitHubUserRepository[]): DashboardRepository[] {
  return repositories.map((repository) => emptyRepository({
    owner: repository.owner,
    repo: repository.name,
    fullName: repository.fullName,
    isPrivate: repository.isPrivate,
    installationAccountLogin: repository.installationAccountLogin
  }));
}

function repositoriesFromTracked(repositories: TrackedRepository[]): DashboardRepository[] {
  return repositories.map((repository) => emptyRepository({
    owner: repository.owner,
    repo: repository.name,
    fullName: repository.fullName,
    isPrivate: repository.isPrivate,
    installationAccountLogin: repository.installation?.accountLogin ?? null
  }));
}

function emptyRepository(input: {
  owner: string;
  repo: string;
  fullName: string;
  isPrivate: boolean;
  installationAccountLogin: string | null;
}): DashboardRepository {
  return {
    ...input,
    runs: 0,
    activeRuns: 0,
    pullRequests: 0,
    averageScore: null,
    highRiskRuns: 0,
    source: "installed",
    latestRun: null
  };
}

function mergeRepositories(
  installed: DashboardRepository[],
  analyzed: DashboardRepository[]
): DashboardRepository[] {
  const merged = new Map<string, DashboardRepository>();

  for (const repository of installed) {
    merged.set(repository.fullName.toLowerCase(), repository);
  }

  for (const repository of analyzed) {
    const key = repository.fullName.toLowerCase();
    const existing = merged.get(key);

    merged.set(key, {
      ...repository,
      isPrivate: existing?.isPrivate ?? repository.isPrivate,
      source: existing ? "installed" : "analyzed",
      installationAccountLogin: existing?.installationAccountLogin ?? null
    });
  }

  return [...merged.values()].sort((a, b) => {
    const aTime = a.latestRun?.createdAt.getTime() ?? 0;
    const bTime = b.latestRun?.createdAt.getTime() ?? 0;

    if (aTime !== bTime) {
      return bTime - aTime;
    }

    return a.fullName.localeCompare(b.fullName);
  });
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
