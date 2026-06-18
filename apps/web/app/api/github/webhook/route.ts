import {
  createQueuedAnalysisRun,
  markWebhookEventProcessed,
  saveWebhookEvent,
  upsertGitHubInstallation,
  upsertGitHubRepository
} from "@bitspam/db";
import {
  createBitSpamCheckRun,
  isInstallationWebhookPayload,
  isPullRequestWebhookPayload,
  parseWebhookJson,
  shouldAnalyzePullRequestAction,
  verifyGitHubWebhookSignature
} from "@bitspam/github";
import type { PullRequestWebhookPayload } from "@bitspam/github";
import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { getAnalyzePrQueue } from "@/lib/queue";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();
  const webhookSecret = requiredEnv("GITHUB_WEBHOOK_SECRET");
  const eventName = request.headers.get("x-github-event");
  const delivery = request.headers.get("x-github-delivery");
  const signature256 = request.headers.get("x-hub-signature-256");

  if (!eventName || !delivery) {
    return NextResponse.json({ error: "Missing GitHub webhook headers." }, { status: 400 });
  }

  if (!verifyGitHubWebhookSignature(body, webhookSecret, { signature256 })) {
    return NextResponse.json({ error: "Invalid GitHub webhook signature." }, { status: 401 });
  }

  const payload = parseWebhookJson(body);
  const action = getWebhookAction(payload);
  const savedEvent = await saveWebhookEvent(getDb(), {
    githubDelivery: delivery,
    eventName,
    ...(action ? { action } : {}),
    payload: toJsonRecord(payload)
  });

  if (!savedEvent.id) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (eventName === "installation" || eventName === "installation_repositories") {
    await handleInstallationWebhook(payload);
    await markWebhookEventProcessed(getDb(), delivery);

    return NextResponse.json({ ok: true });
  }

  if (eventName !== "pull_request") {
    await markWebhookEventProcessed(getDb(), delivery);

    return NextResponse.json({ ok: true, ignored: true });
  }

  if (!isPullRequestWebhookPayload(payload)) {
    return NextResponse.json({ error: "Unsupported pull_request payload." }, { status: 400 });
  }

  if (!payload.installation?.id) {
    return NextResponse.json({ error: "Pull request webhook is missing installation id." }, { status: 400 });
  }

  await handlePullRequestWebhook(payload);
  await markWebhookEventProcessed(getDb(), delivery);

  return NextResponse.json({ ok: true });
}

async function handleInstallationWebhook(payload: unknown): Promise<void> {
  if (!isInstallationWebhookPayload(payload)) {
    return;
  }

  const accountLogin = payload.installation.account?.login ?? "unknown";
  const accountType = payload.installation.account?.type ?? "unknown";
  const installation = await upsertGitHubInstallation(getDb(), {
    installationId: String(payload.installation.id),
    accountLogin,
    accountType
  });
  const repositories = [
    ...(payload.repositories ?? []),
    ...(payload.repositories_added ?? [])
  ];

  await Promise.all(
    repositories.map((repository) =>
      upsertGitHubRepository(getDb(), {
        githubId: String(repository.id),
        owner: repository.full_name.split("/")[0] ?? accountLogin,
        name: repository.name,
        fullName: repository.full_name,
        isPrivate: repository.private,
        installationDatabaseId: installation.id
      })
    )
  );
}

async function handlePullRequestWebhook(payload: PullRequestWebhookPayload): Promise<void> {
  if (!payload.installation?.id) {
    return;
  }

  const installation = await upsertGitHubInstallation(getDb(), {
    installationId: String(payload.installation.id),
    accountLogin: payload.repository.owner.login,
    accountType: "RepositoryOwner"
  });
  const repository = await upsertGitHubRepository(getDb(), {
    githubId: String(payload.repository.id),
    owner: payload.repository.owner.login,
    name: payload.repository.name,
    fullName: payload.repository.full_name,
    isPrivate: payload.repository.private,
    installationDatabaseId: installation.id
  });

  if (!shouldAnalyzePullRequestAction(payload.action, payload.pull_request.draft)) {
    return;
  }

  const saved = await createQueuedAnalysisRun(getDb(), {
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    number: payload.pull_request.number,
    url: payload.pull_request.html_url,
    repositoryGithubId: String(payload.repository.id),
    isPrivate: payload.repository.private,
    installationDatabaseId: installation.id,
    title: payload.pull_request.title,
    authorLogin: payload.pull_request.user?.login ?? "unknown",
    headSha: payload.pull_request.head.sha,
    baseSha: payload.pull_request.base.sha
  });
  const detailsUrl = detailsUrlFor(saved.id);
  const checkRunId = await createBitSpamCheckRun({
    credentials: getGitHubAppCredentials(),
    installationId: payload.installation.id,
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    number: payload.pull_request.number,
    headSha: payload.pull_request.head.sha,
    detailsUrl
  });

  await getAnalyzePrQueue().add(
    "analyze-pr",
    {
      analysisRunId: saved.id,
      url: payload.pull_request.html_url,
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      number: payload.pull_request.number,
      installationId: String(payload.installation.id),
      repositoryId: repository.id,
      pullRequestId: saved.pullRequestId,
      headSha: payload.pull_request.head.sha,
      checkRunId: String(checkRunId)
    },
    {
      attempts: 2,
      backoff: {
        type: "exponential",
        delay: 5000
      },
      removeOnComplete: 100,
      removeOnFail: 100
    }
  );
}

function getGitHubAppCredentials() {
  return {
    appId: requiredEnv("GITHUB_APP_ID"),
    privateKey: requiredEnv("GITHUB_APP_PRIVATE_KEY")
  };
}

function detailsUrlFor(analysisRunId: string): string | undefined {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  return appUrl ? `${appUrl.replace(/\/$/, "")}/history/${analysisRunId}` : undefined;
}

function getWebhookAction(payload: unknown): string | undefined {
  if (typeof payload === "object" && payload !== null && "action" in payload) {
    const action = (payload as { action?: unknown }).action;

    return typeof action === "string" ? action : undefined;
  }

  return undefined;
}

function toJsonRecord(payload: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
}

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for GitHub App webhooks.`);
  }

  return value;
}
