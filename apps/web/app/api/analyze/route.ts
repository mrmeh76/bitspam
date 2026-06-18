import { analyzePullRequest } from "@bitspam/analyzer";
import { fetchPullRequestContextFromUrl } from "@bitspam/github";
import type { PullRequestContext } from "@bitspam/shared";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type AnalyzeRequestBody = {
  url?: unknown;
};

export async function POST(request: Request) {
  let body: AnalyzeRequestBody;

  try {
    body = (await request.json()) as AnalyzeRequestBody;
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  if (typeof body.url !== "string" || body.url.trim().length === 0) {
    return errorResponse("A GitHub pull request URL is required.", 400);
  }

  try {
    const context = await fetchPullRequestContextFromUrl(body.url.trim(), {
      githubToken: process.env.GITHUB_TOKEN
    });
    const result = await analyzePullRequest(context);

    return NextResponse.json({
      result,
      pullRequest: summarizePullRequest(context)
    });
  } catch (error) {
    return handleAnalyzeError(error);
  }
}

function summarizePullRequest(context: PullRequestContext) {
  const additions = context.changedFiles.reduce(
    (total, file) => total + file.additions,
    0
  );
  const deletions = context.changedFiles.reduce(
    (total, file) => total + file.deletions,
    0
  );

  return {
    owner: context.owner,
    repo: context.repo,
    number: context.number,
    title: context.title,
    authorLogin: context.authorLogin,
    authorAssociation: context.authorAssociation,
    headSha: context.headSha,
    baseSha: context.baseSha,
    changedFiles: context.changedFiles.map((file) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes
    })),
    totals: {
      files: context.changedFiles.length,
      additions,
      deletions,
      changes: additions + deletions,
      commits: context.commits.length,
      checkRuns: context.checkRuns.length,
      comments: context.comments.length,
      linkedIssues: context.linkedIssues.length
    },
    repoFiles: {
      hasReadme: Boolean(context.repoFiles.readme),
      hasContributing: Boolean(context.repoFiles.contributing),
      hasPullRequestTemplate: Boolean(context.repoFiles.pullRequestTemplate),
      hasCodeowners: Boolean(context.repoFiles.codeowners),
      hasBitspamConfig: Boolean(context.repoFiles.bitspamConfig)
    },
    contributorStats: context.contributorStats
  };
}

function handleAnalyzeError(error: unknown) {
  const status = getErrorStatus(error);
  const message = error instanceof Error ? error.message : "Analysis failed.";

  if (message.includes("unable to verify the first certificate")) {
    return errorResponse(
      "Node could not verify GitHub's TLS certificate on this machine. Configure Node with the local CA chain, or set BITSPAM_ALLOW_INSECURE_GITHUB_TLS=true for local development only.",
      502
    );
  }

  if (status === 403) {
    return errorResponse(
      "GitHub rate-limited this request. Set GITHUB_TOKEN on the server or try again later.",
      403
    );
  }

  if (status === 404) {
    return errorResponse(
      "GitHub could not find that public pull request, or the repository is private.",
      404
    );
  }

  if (status && status >= 500) {
    return errorResponse(
      "GitHub returned a temporary upstream error while fetching that pull request.",
      502
    );
  }

  if (message.startsWith("GitHub") || message.startsWith("Invalid") || message.startsWith("Expected")) {
    return errorResponse(message, 400);
  }

  return errorResponse("BitSpam could not analyze that pull request.", 500);
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;

    return typeof status === "number" ? status : undefined;
  }

  return undefined;
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
