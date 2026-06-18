import { Queue, Worker } from "bullmq";

import type { AnalyzePrJobData, AnalyzePrJobResult } from "./types.js";

export const ANALYZE_PR_QUEUE_NAME = "analyze-pr";

export function createAnalyzePrQueue(redisUrl: string) {
  return new Queue<AnalyzePrJobData>(ANALYZE_PR_QUEUE_NAME, {
    connection: {
      url: redisUrl,
      family: 0,
      maxRetriesPerRequest: null
    }
  });
}

export function createAnalyzePrWorker(
  redisUrl: string,
  processor: (data: AnalyzePrJobData) => Promise<AnalyzePrJobResult>
) {
  return new Worker<AnalyzePrJobData, AnalyzePrJobResult>(
    ANALYZE_PR_QUEUE_NAME,
    async (job) => processor(job.data),
    {
      connection: {
        url: redisUrl,
        family: 0,
        maxRetriesPerRequest: null
      }
    }
  );
}
