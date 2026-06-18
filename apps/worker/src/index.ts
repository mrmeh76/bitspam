import "dotenv/config";

import { analyzePullRequest, createAIProviderFromEnv } from "@bitspam/analyzer";
import {
  completeAnalysisRun,
  createDbClient,
  failAnalysisRun,
  markAnalysisRunProcessing
} from "@bitspam/db";
import { fetchPullRequestContextFromUrl } from "@bitspam/github";
import { createAnalyzePrWorker } from "@bitspam/queue";
import type { AnalyzePrJobData, AnalyzePrJobResult } from "@bitspam/queue";

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
    const context = await fetchPullRequestContextFromUrl(data.url, {
      githubToken: process.env.GITHUB_TOKEN
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

    await completeAnalysisRun(db, {
      analysisRunId: data.analysisRunId,
      context,
      result
    });

    return {
      analysisRunId: data.analysisRunId,
      status: "completed"
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed.";
    await failAnalysisRun(db, data.analysisRunId, message);
    throw error;
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required to start the BitSpam worker.`);
  }

  return value;
}
