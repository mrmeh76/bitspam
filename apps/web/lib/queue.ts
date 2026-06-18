import { createAnalyzePrQueue } from "@bitspam/queue";

type AnalyzePrQueue = ReturnType<typeof createAnalyzePrQueue>;

let queue: AnalyzePrQueue | undefined;

export function getAnalyzePrQueue(): AnalyzePrQueue {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("REDIS_URL is required to queue pull request analysis.");
  }

  queue ??= createAnalyzePrQueue(redisUrl);

  return queue;
}
