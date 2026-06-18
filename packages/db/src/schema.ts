import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

import type {
  AISemanticResult,
  FindingCategory,
  FindingSeverity,
  ScoreBreakdown,
  Verdict
} from "@bitspam/shared";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
};

export const githubInstallations = pgTable(
  "github_installations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    installationId: text("installation_id").notNull(),
    accountLogin: text("account_login").notNull(),
    accountType: text("account_type").notNull(),
    ...timestamps
  },
  (table) => [
    uniqueIndex("github_installations_installation_id_idx").on(table.installationId)
  ]
);

export const repositories = pgTable(
  "repositories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    githubId: text("github_id").notNull(),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    fullName: text("full_name").notNull(),
    isPrivate: boolean("private").notNull().default(false),
    installationId: uuid("installation_id").references(() => githubInstallations.id, {
      onDelete: "set null"
    }),
    ...timestamps
  },
  (table) => [
    uniqueIndex("repositories_github_id_idx").on(table.githubId),
    uniqueIndex("repositories_owner_name_idx").on(table.owner, table.name),
    index("repositories_installation_id_idx").on(table.installationId)
  ]
);

export const pullRequests = pgTable(
  "pull_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    githubId: text("github_id").notNull(),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    authorLogin: text("author_login").notNull(),
    state: text("state").notNull(),
    headSha: text("head_sha").notNull(),
    baseSha: text("base_sha").notNull(),
    ...timestamps
  },
  (table) => [
    uniqueIndex("pull_requests_repository_number_idx").on(table.repositoryId, table.number),
    index("pull_requests_repository_id_idx").on(table.repositoryId),
    index("pull_requests_github_id_idx").on(table.githubId)
  ]
);

export const analysisRuns = pgTable(
  "analysis_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pullRequestId: uuid("pull_request_id")
      .notNull()
      .references(() => pullRequests.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    score: integer("score"),
    verdict: text("verdict").$type<Verdict>(),
    summary: text("summary"),
    rawInput: jsonb("raw_input").$type<Record<string, unknown>>(),
    scoreBreakdown: jsonb("score_breakdown").$type<ScoreBreakdown>(),
    suggestedContributorComment: text("suggested_contributor_comment"),
    maintainerRecommendation: text("maintainer_recommendation"),
    aiResult: jsonb("ai_result").$type<AISemanticResult>(),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    error: text("error")
  },
  (table) => [
    index("analysis_runs_pull_request_id_idx").on(table.pullRequestId),
    index("analysis_runs_status_idx").on(table.status)
  ]
);

export const findings = pgTable(
  "findings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    analysisRunId: uuid("analysis_run_id")
      .notNull()
      .references(() => analysisRuns.id, { onDelete: "cascade" }),
    checkId: text("check_id").notNull(),
    title: text("title").notNull(),
    severity: text("severity").$type<FindingSeverity>().notNull(),
    category: text("category").$type<FindingCategory>().notNull(),
    message: text("message").notNull(),
    evidence: jsonb("evidence").$type<string[]>().notNull(),
    recommendation: text("recommendation").notNull(),
    scoreImpact: integer("score_impact").notNull()
  },
  (table) => [
    index("findings_analysis_run_id_idx").on(table.analysisRunId),
    index("findings_check_id_idx").on(table.checkId)
  ]
);

export const repoPolicies = pgTable(
  "repo_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().notNull(),
    ...timestamps
  },
  (table) => [
    index("repo_policies_repository_id_idx").on(table.repositoryId),
    uniqueIndex("repo_policies_repository_source_idx").on(table.repositoryId, table.source)
  ]
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    githubDelivery: text("github_delivery").notNull(),
    eventName: text("event_name").notNull(),
    action: text("action"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    processed: boolean("processed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("webhook_events_github_delivery_idx").on(table.githubDelivery),
    index("webhook_events_event_name_idx").on(table.eventName),
    index("webhook_events_processed_idx").on(table.processed)
  ]
);

export const proofComments = pgTable(
  "proof_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pullRequestId: uuid("pull_request_id")
      .notNull()
      .references(() => pullRequests.id, { onDelete: "cascade" }),
    analysisRunId: uuid("analysis_run_id")
      .notNull()
      .references(() => analysisRuns.id, { onDelete: "cascade" }),
    commentType: text("comment_type").notNull(),
    githubCommentId: text("github_comment_id"),
    bodyHash: text("body_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("proof_comments_pull_request_id_idx").on(table.pullRequestId),
    index("proof_comments_analysis_run_id_idx").on(table.analysisRunId),
    uniqueIndex("proof_comments_pull_request_type_hash_idx").on(
      table.pullRequestId,
      table.commentType,
      table.bodyHash
    )
  ]
);
