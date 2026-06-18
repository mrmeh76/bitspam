import { Queue } from "bullmq";

import type { AnalyzePrJobData } from "./types.js";

export const ANALYZE_PR_QUEUE_NAME = "analyze-pr";

export function createAnalyzePrQueue(redisUrl: string) {
  return new Queue<AnalyzePrJobData>(ANALYZE_PR_QUEUE_NAME, {
    connection: {
      url: redisUrl,
      maxRetriesPerRequest: null
    }
  });
}
