import "dotenv/config";

import { analyzePullRequest, createAIProviderFromEnv } from "@bitspam/analyzer";
import {
  completeAnalysisRun,
  createDbClient,
  failAnalysisRun,
  markAnalysisRunProcessing,
  saveProofCommentRecord
} from "@bitspam/db";
import {
  applyBitSpamReviewActions,
  failBitSpamCheckRun,
  fetchPullRequestContextFromUrl,
  getInstallationAccessToken,
  updateBitSpamCheckRun
} from "@bitspam/github";
import { createAnalyzePrWorker } from "@bitspam/queue";
import type { AnalyzePrJobData, AnalyzePrJobResult } from "@bitspam/queue";
import type { AnalysisResult } from "@bitspam/shared";

const redisUrl = requiredEnv("REDIS_URL");
const databaseUrl = requiredEnv("DATABASE_URL");
const db = createDbClient(databaseUrl);
const worker = createAnalyzePrWorker(redisUrl, processAnalyzePrJob);

console.log("BitSpam worker started.");
console.log(`Processing analyze-pr jobs with Redis at ${redisUrl}.`);

worker.on("completed", (job) => {
  console.log(`Analysis job ${job.id} completed for run ${job.data.analysisRunId}.`);
});

worker.on("failed", (job, error) => {
  const runId = job?.data.analysisRunId ?? "unknown";

  console.error(`Analysis job ${job?.id ?? "unknown"} failed for run ${runId}:`, error);
});

async function processAnalyzePrJob(
  data: AnalyzePrJobData
): Promise<AnalyzePrJobResult> {
  try {
    await markAnalysisRunProcessing(db, data.analysisRunId);
    const githubToken = data.installationId
      ? await getInstallationAccessToken(getGitHubAppCredentials(), data.installationId)
      : process.env.GITHUB_TOKEN;
    const context = await fetchPullRequestContextFromUrl(data.url, {
      githubToken
    });
    const result = await analyzePullRequest(context, {
      aiProvider: createAIProviderFromEnv({
        AI_PROVIDER: process.env.AI_PROVIDER,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        GEMINI_MODEL: process.env.GEMINI_MODEL,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        OPENAI_MODEL: process.env.OPENAI_MODEL
      })
    });

    const saved = await completeAnalysisRun(db, {
      analysisRunId: data.analysisRunId,
      context,
      result
    });

    if (data.installationId) {
      await reportToGitHub(data, result, saved.pullRequestId);
    }

    return {
      analysisRunId: data.analysisRunId,
      status: "completed"
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed.";
    await failAnalysisRun(db, data.analysisRunId, message);
    await reportFailureToGitHub(data, message);
    throw error;
  }
}

async function reportToGitHub(
  data: AnalyzePrJobData,
  result: AnalysisResult,
  pullRequestId: string
): Promise<void> {
  const credentials = getGitHubAppCredentials();
  const detailsUrl = detailsUrlFor(data.analysisRunId);

  if (data.checkRunId) {
    await updateBitSpamCheckRun({
      credentials,
      installationId: data.installationId!,
      owner: data.owner,
      repo: data.repo,
      number: data.number,
      checkRunId: data.checkRunId,
      result,
      detailsUrl
    });
  }

  const commentBody = shouldPostProofComment(result)
    ? buildProofComment(data.analysisRunId, result)
    : undefined;
  const { commentId } = await applyBitSpamReviewActions({
    credentials,
    installationId: data.installationId!,
    owner: data.owner,
    repo: data.repo,
    number: data.number,
    result,
    commentBody
  });

  if (commentBody) {
    await saveProofCommentRecord(db, {
      pullRequestId,
      analysisRunId: data.analysisRunId,
      body: commentBody,
      githubCommentId: commentId
    });
  }
}

function shouldPostProofComment(
  result: AnalysisResult
): boolean {
  return result.verdict !== "review_ready";
}

function buildProofComment(
  analysisRunId: string,
  result: AnalysisResult
): string {
  return [
    "<!-- bitspam:proof-of-work -->",
    `BitSpam scored this pull request at ${result.score}/100.`,
    "",
    result.suggestedContributorComment,
    "",
    detailsUrlFor(analysisRunId)
      ? `Saved report: ${detailsUrlFor(analysisRunId)}`
      : `Analysis run: ${analysisRunId}`
  ].join("\n");
}

async function reportFailureToGitHub(
  data: AnalyzePrJobData,
  message: string
): Promise<void> {
  if (!data.installationId || !data.checkRunId) {
    return;
  }

  try {
    await failBitSpamCheckRun({
      credentials: getGitHubAppCredentials(),
      installationId: data.installationId,
      owner: data.owner,
      repo: data.repo,
      number: data.number,
      checkRunId: data.checkRunId,
      error: message,
      detailsUrl: detailsUrlFor(data.analysisRunId)
    });
  } catch (error) {
    console.error("Failed to update BitSpam check run after analysis failure:", error);
  }
}

function detailsUrlFor(analysisRunId: string): string | undefined {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  return appUrl ? `${appUrl.replace(/\/$/, "")}/history/${analysisRunId}` : undefined;
}

function getGitHubAppCredentials() {
  return {
    appId: requiredEnv("GITHUB_APP_ID"),
    privateKey: requiredEnv("GITHUB_APP_PRIVATE_KEY")
  };
}

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required to start the BitSpam worker.`);
  }

  return value;
}
