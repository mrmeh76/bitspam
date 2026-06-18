import "dotenv/config";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

console.log("BitSpam worker started.");
console.log(`Queue backend configured at ${redisUrl}. Job processing is not enabled in Phase 0.`);
