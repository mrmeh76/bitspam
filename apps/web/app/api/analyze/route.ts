import { createQueuedAnalysisRun, failAnalysisRun } from "@bitspam/db";
import { parseGitHubPullRequestUrl } from "@bitspam/github";
import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { getAnalyzePrQueue } from "@/lib/queue";

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
    const url = body.url.trim();
    const location = parseGitHubPullRequestUrl(url);
    const saved = await createQueuedAnalysisRun(getDb(), {
      ...location,
      url
    });

    try {
      await getAnalyzePrQueue().add(
        "analyze-pr",
        {
          analysisRunId: saved.id,
          url,
          ...location
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
    } catch (error) {
      await failAnalysisRun(
        getDb(),
        saved.id,
        error instanceof Error ? error.message : "Failed to enqueue analysis job."
      );

      throw error;
    }

    return NextResponse.json({
      analysisRunId: saved.id,
      status: "queued",
      pullRequest: {
        owner: location.owner,
        repo: location.repo,
        number: location.number
      }
    }, { status: 202 });
  } catch (error) {
    return handleAnalyzeError(error);
  }
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

  if (message.includes("DATABASE_URL") || message.includes("REDIS_URL")) {
    return errorResponse(message, 500);
  }

  if (message.includes("ECONNREFUSED")) {
    return errorResponse(
      "BitSpam could not connect to Redis to queue this analysis job.",
      503
    );
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
