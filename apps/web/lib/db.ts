import { createDbClient } from "@bitspam/db";

type DbClient = ReturnType<typeof createDbClient>;

let db: DbClient | undefined;

export function getDb(): DbClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for persisted analysis history.");
  }

  db ??= createDbClient(databaseUrl);

  return db;
}
