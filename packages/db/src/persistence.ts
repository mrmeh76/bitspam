import { createHash } from "node:crypto";

import { desc, eq } from "drizzle-orm";

import type { AnalysisResult, PullRequestContext } from "@bitspam/shared";

import type { BitSpamDb } from "./client.js";
import {
  analysisRuns,
  findings,
  githubInstallations,
  proofComments,
  pullRequests,
  repositories,
  repoPolicies,
  webhookEvents,
  type AnalysisRunStatus
} from "./schema.js";

export type CreateQueuedAnalysisRunInput = {
  owner: string;
  repo: string;
  number: number;
  url: string;
  repositoryGithubId?: string | undefined;
  isPrivate?: boolean | undefined;
  installationDatabaseId?: string | undefined;
  title?: string | undefined;
  authorLogin?: string | undefined;
  headSha?: string | undefined;
  baseSha?: string | undefined;
};

export type UpsertGitHubInstallationInput = {
  installationId: string;
  accountLogin: string;
  accountType: string;
};

export type UpsertGitHubRepositoryInput = {
  githubId: string;
  owner: string;
  name: string;
  fullName: string;
  isPrivate: boolean;
  installationDatabaseId?: string | undefined;
};

export type SaveWebhookEventInput = {
  githubDelivery: string;
  eventName: string;
  action?: string | undefined;
  payload: Record<string, unknown>;
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

export type TrackedRepository = {
  id: string;
  githubId: string;
  owner: string;
  name: string;
  fullName: string;
  isPrivate: boolean;
  updatedAt: Date;
  installation: {
    installationId: string;
    accountLogin: string;
    accountType: string;
  } | null;
};

export type AnalysisRunDetail = AnalysisHistoryItem & {
  rawInput: Record<string, unknown> | null;
  scoreBreakdown: AnalysisResult["scoreBreakdown"] | null;
  suggestedContributorComment: string | null;
  maintainerRecommendation: string | null;
  ai: AnalysisResult["ai"] | null;
  findings: AnalysisResult["findings"];
};

export async function upsertGitHubInstallation(
  db: BitSpamDb,
  input: UpsertGitHubInstallationInput
): Promise<{ id: string }> {
  const [installation] = await db
    .insert(githubInstallations)
    .values({
      installationId: input.installationId,
      accountLogin: input.accountLogin,
      accountType: input.accountType
    })
    .onConflictDoUpdate({
      target: githubInstallations.installationId,
      set: {
        accountLogin: input.accountLogin,
        accountType: input.accountType,
        updatedAt: new Date()
      }
    })
    .returning({ id: githubInstallations.id });

  if (!installation) {
    throw new Error("Failed to save GitHub installation.");
  }

  return installation;
}

export async function upsertGitHubRepository(
  db: BitSpamDb,
  input: UpsertGitHubRepositoryInput
): Promise<{ id: string }> {
  return upsertRepository(db, {
    owner: input.owner,
    repo: input.name,
    repositoryGithubId: input.githubId,
    fullName: input.fullName,
    isPrivate: input.isPrivate,
    installationDatabaseId: input.installationDatabaseId
  });
}

export async function saveWebhookEvent(
  db: BitSpamDb,
  input: SaveWebhookEventInput
): Promise<{ id: string | undefined }> {
  const [event] = await db
    .insert(webhookEvents)
    .values({
      githubDelivery: input.githubDelivery,
      eventName: input.eventName,
      action: input.action,
      payload: input.payload
    })
    .onConflictDoNothing({
      target: webhookEvents.githubDelivery
    })
    .returning({ id: webhookEvents.id });

  return { id: event?.id };
}

export async function markWebhookEventProcessed(
  db: BitSpamDb,
  githubDelivery: string
): Promise<void> {
  await db
    .update(webhookEvents)
    .set({ processed: true })
    .where(eq(webhookEvents.githubDelivery, githubDelivery));
}

export async function saveProofCommentRecord(
  db: BitSpamDb,
  input: {
    pullRequestId: string;
    analysisRunId: string;
    body: string;
    commentType?: string | undefined;
    githubCommentId?: string | number | undefined;
  }
): Promise<void> {
  await db
    .insert(proofComments)
    .values({
      pullRequestId: input.pullRequestId,
      analysisRunId: input.analysisRunId,
      commentType: input.commentType ?? "proof-of-work",
      githubCommentId: input.githubCommentId ? String(input.githubCommentId) : undefined,
      bodyHash: createHash("sha256").update(input.body).digest("hex")
    })
    .onConflictDoNothing({
      target: [
        proofComments.pullRequestId,
        proofComments.commentType,
        proofComments.bodyHash
      ]
    });
}

export async function createQueuedAnalysisRun(
  db: BitSpamDb,
  input: CreateQueuedAnalysisRunInput
): Promise<SavedAnalysisRun> {
  const repository = await upsertRepository(db, {
    owner: input.owner,
    repo: input.repo,
    repositoryGithubId: input.repositoryGithubId,
    isPrivate: input.isPrivate,
    installationDatabaseId: input.installationDatabaseId
  });
  const pullRequest = await upsertQueuedPullRequest(db, repository.id, {
    owner: input.owner,
    repo: input.repo,
    number: input.number,
    title: input.title ?? `Pending analysis for #${input.number}`,
    authorLogin: input.authorLogin ?? "unknown",
    headSha: input.headSha ?? "",
    baseSha: input.baseSha ?? ""
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

export async function listTrackedRepositories(
  db: BitSpamDb,
  limit = 200
): Promise<TrackedRepository[]> {
  const rows = await db
    .select({
      repository: repositories,
      installation: githubInstallations
    })
    .from(repositories)
    .leftJoin(githubInstallations, eq(repositories.installationId, githubInstallations.id))
    .orderBy(desc(repositories.updatedAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.repository.id,
    githubId: row.repository.githubId,
    owner: row.repository.owner,
    name: row.repository.name,
    fullName: row.repository.fullName,
    isPrivate: row.repository.isPrivate,
    updatedAt: row.repository.updatedAt,
    installation: row.installation
      ? {
          installationId: row.installation.installationId,
          accountLogin: row.installation.accountLogin,
          accountType: row.installation.accountType
        }
      : null
  }));
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
  context: Pick<PullRequestContext, "owner" | "repo"> & {
    repositoryGithubId?: string | undefined;
    fullName?: string | undefined;
    isPrivate?: boolean | undefined;
    installationDatabaseId?: string | undefined;
  }
) {
  const fullName = context.fullName ?? `${context.owner}/${context.repo}`;
  const [repository] = await db
    .insert(repositories)
    .values({
      githubId: context.repositoryGithubId ?? fullName,
      owner: context.owner,
      name: context.repo,
      fullName,
      isPrivate: context.isPrivate ?? false,
      installationId: context.installationDatabaseId
    })
    .onConflictDoUpdate({
      target: [repositories.owner, repositories.name],
      set: {
        githubId: context.repositoryGithubId ?? fullName,
        fullName,
        isPrivate: context.isPrivate ?? false,
        installationId: context.installationDatabaseId,
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
