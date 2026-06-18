import { desc, eq } from "drizzle-orm";

import type { AnalysisResult, PullRequestContext } from "@bitspam/shared";

import type { BitSpamDb } from "./client.js";
import {
  analysisRuns,
  findings,
  pullRequests,
  repositories,
  repoPolicies,
  type AnalysisRunStatus
} from "./schema.js";

export type CreateQueuedAnalysisRunInput = {
  owner: string;
  repo: string;
  number: number;
  url: string;
};

export type SaveAnalysisRunInput = {
  context: PullRequestContext;
  result: AnalysisResult;
  analysisRunId?: string;
};

export type CompleteAnalysisRunInput = {
  analysisRunId: string;
  context: PullRequestContext;
  result: AnalysisResult;
};

export type SavedAnalysisRun = {
  id: string;
  repositoryId: string;
  pullRequestId: string;
};

export type AnalysisHistoryItem = {
  id: string;
  status: AnalysisRunStatus;
  createdAt: Date;
  completedAt: Date | null;
  score: number | null;
  verdict: AnalysisResult["verdict"] | null;
  summary: string | null;
  error: string | null;
  findingsCount: number;
  pullRequest: {
    number: number;
    title: string;
    authorLogin: string;
    headSha: string;
    baseSha: string;
  };
  repository: {
    owner: string;
    name: string;
    fullName: string;
  };
};

export type AnalysisRunDetail = AnalysisHistoryItem & {
  rawInput: Record<string, unknown> | null;
  scoreBreakdown: AnalysisResult["scoreBreakdown"] | null;
  suggestedContributorComment: string | null;
  maintainerRecommendation: string | null;
  ai: AnalysisResult["ai"] | null;
  findings: AnalysisResult["findings"];
};

export async function createQueuedAnalysisRun(
  db: BitSpamDb,
  input: CreateQueuedAnalysisRunInput
): Promise<SavedAnalysisRun> {
  const repository = await upsertRepository(db, {
    owner: input.owner,
    repo: input.repo
  });
  const pullRequest = await upsertQueuedPullRequest(db, repository.id, {
    owner: input.owner,
    repo: input.repo,
    number: input.number,
    title: `Pending analysis for #${input.number}`,
    authorLogin: "unknown",
    headSha: "",
    baseSha: ""
  });
  const [analysisRun] = await db
    .insert(analysisRuns)
    .values({
      pullRequestId: pullRequest.id,
      status: "queued",
      summary: "Analysis queued.",
      rawInput: {
        url: input.url,
        owner: input.owner,
        repo: input.repo,
        number: input.number
      }
    })
    .returning({ id: analysisRuns.id });

  if (!analysisRun) {
    throw new Error("Failed to create queued analysis run.");
  }

  return {
    id: analysisRun.id,
    repositoryId: repository.id,
    pullRequestId: pullRequest.id
  };
}

export async function saveAnalysisRun(
  db: BitSpamDb,
  { analysisRunId, context, result }: SaveAnalysisRunInput
): Promise<SavedAnalysisRun> {
  if (analysisRunId) {
    return completeAnalysisRun(db, { analysisRunId, context, result });
  }

  const repository = await upsertRepository(db, context);
  const pullRequest = await upsertPullRequest(db, repository.id, context);
  await upsertRepoPolicy(db, repository.id, context);
  const [analysisRun] = await db
    .insert(analysisRuns)
    .values({
      pullRequestId: pullRequest.id,
      status: "completed",
      score: result.score,
      verdict: result.verdict,
      summary: result.summary,
      rawInput: toJsonObject(context),
      scoreBreakdown: result.scoreBreakdown,
      suggestedContributorComment: result.suggestedContributorComment,
      maintainerRecommendation: result.maintainerRecommendation,
      ...(result.ai ? { aiResult: result.ai } : {}),
      completedAt: new Date()
    })
    .returning({ id: analysisRuns.id });

  if (!analysisRun) {
    throw new Error("Failed to save analysis run.");
  }

  if (result.findings.length > 0) {
    await insertFindings(db, analysisRun.id, result);
  }

  return {
    id: analysisRun.id,
    repositoryId: repository.id,
    pullRequestId: pullRequest.id
  };
}

export async function markAnalysisRunProcessing(
  db: BitSpamDb,
  analysisRunId: string
): Promise<void> {
  await db
    .update(analysisRuns)
    .set({
      status: "processing",
      summary: "Analysis is running."
    })
    .where(eq(analysisRuns.id, analysisRunId));
}

export async function failAnalysisRun(
  db: BitSpamDb,
  analysisRunId: string,
  error: string
): Promise<void> {
  await db
    .update(analysisRuns)
    .set({
      status: "failed",
      summary: "Analysis failed.",
      completedAt: new Date(),
      error
    })
    .where(eq(analysisRuns.id, analysisRunId));
}

export async function completeAnalysisRun(
  db: BitSpamDb,
  { analysisRunId, context, result }: CompleteAnalysisRunInput
): Promise<SavedAnalysisRun> {
  const repository = await upsertRepository(db, context);
  const pullRequest = await upsertPullRequest(db, repository.id, context);
  await upsertRepoPolicy(db, repository.id, context);

  const [analysisRun] = await db
    .update(analysisRuns)
    .set({
      pullRequestId: pullRequest.id,
      status: "completed",
      score: result.score,
      verdict: result.verdict,
      summary: result.summary,
      rawInput: toJsonObject(context),
      scoreBreakdown: result.scoreBreakdown,
      suggestedContributorComment: result.suggestedContributorComment,
      maintainerRecommendation: result.maintainerRecommendation,
      aiResult: result.ai ?? null,
      completedAt: new Date(),
      error: null
    })
    .where(eq(analysisRuns.id, analysisRunId))
    .returning({ id: analysisRuns.id });

  if (!analysisRun) {
    throw new Error("Failed to complete analysis run.");
  }

  await db.delete(findings).where(eq(findings.analysisRunId, analysisRun.id));

  if (result.findings.length > 0) {
    await insertFindings(db, analysisRun.id, result);
  }

  return {
    id: analysisRun.id,
    repositoryId: repository.id,
    pullRequestId: pullRequest.id
  };
}

export async function listRecentAnalysisRuns(
  db: BitSpamDb,
  limit = 25
): Promise<AnalysisHistoryItem[]> {
  const rows = await db
    .select({
      analysisRun: analysisRuns,
      pullRequest: pullRequests,
      repository: repositories
    })
    .from(analysisRuns)
    .innerJoin(pullRequests, eq(analysisRuns.pullRequestId, pullRequests.id))
    .innerJoin(repositories, eq(pullRequests.repositoryId, repositories.id))
    .orderBy(desc(analysisRuns.startedAt))
    .limit(limit);

  return Promise.all(
    rows.map(async (row) => ({
      ...mapHistoryRow(row),
      findingsCount: await countFindingsForRun(db, row.analysisRun.id)
    }))
  );
}

export async function getAnalysisRunDetail(
  db: BitSpamDb,
  id: string
): Promise<AnalysisRunDetail | undefined> {
  const [row] = await db
    .select({
      analysisRun: analysisRuns,
      pullRequest: pullRequests,
      repository: repositories
    })
    .from(analysisRuns)
    .innerJoin(pullRequests, eq(analysisRuns.pullRequestId, pullRequests.id))
    .innerJoin(repositories, eq(pullRequests.repositoryId, repositories.id))
    .where(eq(analysisRuns.id, id))
    .limit(1);

  if (!row) {
    return undefined;
  }

  const savedFindings = await db
    .select()
    .from(findings)
    .where(eq(findings.analysisRunId, id));

  return {
    ...mapHistoryRow(row),
    findingsCount: savedFindings.length,
    rawInput: row.analysisRun.rawInput ?? null,
    scoreBreakdown: row.analysisRun.scoreBreakdown ?? null,
    suggestedContributorComment: row.analysisRun.suggestedContributorComment ?? null,
    maintainerRecommendation: row.analysisRun.maintainerRecommendation ?? null,
    ai: row.analysisRun.aiResult ?? null,
    findings: savedFindings.map((finding) => ({
      id: finding.id,
      checkId: finding.checkId,
      title: finding.title,
      severity: finding.severity,
      category: finding.category,
      message: finding.message,
      evidence: finding.evidence,
      recommendation: finding.recommendation,
      scoreImpact: finding.scoreImpact
    }))
  };
}

async function insertFindings(
  db: BitSpamDb,
  analysisRunId: string,
  result: AnalysisResult
): Promise<void> {
  await db.insert(findings).values(
    result.findings.map((finding) => ({
      analysisRunId,
      checkId: finding.checkId,
      title: finding.title,
      severity: finding.severity,
      category: finding.category,
      message: finding.message,
      evidence: finding.evidence,
      recommendation: finding.recommendation,
      scoreImpact: finding.scoreImpact
    }))
  );
}

async function upsertRepository(
  db: BitSpamDb,
  context: Pick<PullRequestContext, "owner" | "repo">
) {
  const [repository] = await db
    .insert(repositories)
    .values({
      githubId: `${context.owner}/${context.repo}`,
      owner: context.owner,
      name: context.repo,
      fullName: `${context.owner}/${context.repo}`,
      isPrivate: false
    })
    .onConflictDoUpdate({
      target: [repositories.owner, repositories.name],
      set: {
        fullName: `${context.owner}/${context.repo}`,
        updatedAt: new Date()
      }
    })
    .returning({ id: repositories.id });

  if (!repository) {
    throw new Error("Failed to save repository.");
  }

  return repository;
}

async function upsertPullRequest(
  db: BitSpamDb,
  repositoryId: string,
  context: Pick<
    PullRequestContext,
    "owner" | "repo" | "number" | "title" | "authorLogin" | "headSha" | "baseSha"
  >
) {
  const [pullRequest] = await db
    .insert(pullRequests)
    .values({
      githubId: `${context.owner}/${context.repo}#${context.number}`,
      repositoryId,
      number: context.number,
      title: context.title,
      authorLogin: context.authorLogin,
      state: "unknown",
      headSha: context.headSha,
      baseSha: context.baseSha
    })
    .onConflictDoUpdate({
      target: [pullRequests.repositoryId, pullRequests.number],
      set: {
        title: context.title,
        authorLogin: context.authorLogin,
        headSha: context.headSha,
        baseSha: context.baseSha,
        updatedAt: new Date()
      }
    })
    .returning({ id: pullRequests.id });

  if (!pullRequest) {
    throw new Error("Failed to save pull request.");
  }

  return pullRequest;
}

async function upsertQueuedPullRequest(
  db: BitSpamDb,
  repositoryId: string,
  context: Pick<
    PullRequestContext,
    "owner" | "repo" | "number" | "title" | "authorLogin" | "headSha" | "baseSha"
  >
) {
  const [pullRequest] = await db
    .insert(pullRequests)
    .values({
      githubId: `${context.owner}/${context.repo}#${context.number}`,
      repositoryId,
      number: context.number,
      title: context.title,
      authorLogin: context.authorLogin,
      state: "queued",
      headSha: context.headSha,
      baseSha: context.baseSha
    })
    .onConflictDoUpdate({
      target: [pullRequests.repositoryId, pullRequests.number],
      set: {
        updatedAt: new Date()
      }
    })
    .returning({ id: pullRequests.id });

  if (!pullRequest) {
    throw new Error("Failed to save pull request.");
  }

  return pullRequest;
}

async function upsertRepoPolicy(
  db: BitSpamDb,
  repositoryId: string,
  context: PullRequestContext
) {
  const source = context.repoFiles.bitspamConfig ? ".bitspam.yml" : "default";

  await db
    .insert(repoPolicies)
    .values({
      repositoryId,
      source,
      config: toJsonObject(context.policy)
    })
    .onConflictDoUpdate({
      target: [repoPolicies.repositoryId, repoPolicies.source],
      set: {
        config: toJsonObject(context.policy),
        updatedAt: new Date()
      }
    });
}

async function countFindingsForRun(db: BitSpamDb, analysisRunId: string): Promise<number> {
  const savedFindings = await db
    .select({ id: findings.id })
    .from(findings)
    .where(eq(findings.analysisRunId, analysisRunId));

  return savedFindings.length;
}

function mapHistoryRow(row: {
  analysisRun: typeof analysisRuns.$inferSelect;
  pullRequest: typeof pullRequests.$inferSelect;
  repository: typeof repositories.$inferSelect;
}): Omit<AnalysisHistoryItem, "findingsCount"> {
  return {
    id: row.analysisRun.id,
    status: row.analysisRun.status,
    createdAt: row.analysisRun.startedAt,
    completedAt: row.analysisRun.completedAt,
    score: row.analysisRun.score,
    verdict: row.analysisRun.verdict ?? null,
    summary: row.analysisRun.summary ?? null,
    error: row.analysisRun.error ?? null,
    pullRequest: {
      number: row.pullRequest.number,
      title: row.pullRequest.title,
      authorLogin: row.pullRequest.authorLogin,
      headSha: row.pullRequest.headSha,
      baseSha: row.pullRequest.baseSha
    },
    repository: {
      owner: row.repository.owner,
      name: row.repository.name,
      fullName: row.repository.fullName
    }
  };
}

function toJsonObject(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}
