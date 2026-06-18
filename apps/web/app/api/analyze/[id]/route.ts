import { getAnalysisRunDetail } from "@bitspam/db";
import type { AnalysisRunDetail } from "@bitspam/db";
import type { AnalysisResult, PullRequestContext } from "@bitspam/shared";
import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const detail = await getAnalysisRunDetail(getDb(), id);

    if (!detail) {
      return NextResponse.json({ error: "Analysis run not found." }, { status: 404 });
    }

    if (detail.status === "completed") {
      const result = buildAnalysisResult(detail);
      const context = parsePullRequestContext(detail.rawInput);

      return NextResponse.json({
        analysisRunId: detail.id,
        status: detail.status,
        result,
        pullRequest: context
          ? summarizePullRequest(context)
          : summarizeSavedPullRequest(detail)
      });
    }

    return NextResponse.json({
      analysisRunId: detail.id,
      status: detail.status,
      error: detail.error,
      pullRequest: summarizeSavedPullRequest(detail)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load analysis status.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildAnalysisResult(detail: AnalysisRunDetail): AnalysisResult {
  if (
    detail.score === null ||
    detail.verdict === null ||
    detail.scoreBreakdown === null ||
    detail.summary === null ||
    detail.suggestedContributorComment === null ||
    detail.maintainerRecommendation === null
  ) {
    throw new Error("Analysis run is marked completed but is missing report data.");
  }

  return {
    score: detail.score,
    verdict: detail.verdict,
    summary: detail.summary,
    findings: detail.findings,
    scoreBreakdown: detail.scoreBreakdown,
    suggestedContributorComment: detail.suggestedContributorComment,
    maintainerRecommendation: detail.maintainerRecommendation,
    ...(detail.ai ? { ai: detail.ai } : {})
  };
}

function parsePullRequestContext(rawInput: Record<string, unknown> | null): PullRequestContext | undefined {
  if (!rawInput || !Array.isArray(rawInput.changedFiles)) {
    return undefined;
  }

  return rawInput as PullRequestContext;
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

function summarizeSavedPullRequest(detail: AnalysisRunDetail) {
  return {
    owner: detail.repository.owner,
    repo: detail.repository.name,
    number: detail.pullRequest.number,
    title: detail.pullRequest.title,
    authorLogin: detail.pullRequest.authorLogin,
    headSha: detail.pullRequest.headSha,
    baseSha: detail.pullRequest.baseSha,
    changedFiles: [],
    totals: {
      files: 0,
      additions: 0,
      deletions: 0,
      changes: 0,
      commits: 0,
      checkRuns: 0,
      comments: 0,
      linkedIssues: 0
    },
    repoFiles: {
      hasReadme: false,
      hasContributing: false,
      hasPullRequestTemplate: false,
      hasCodeowners: false,
      hasBitspamConfig: false
    },
    contributorStats: {
      isFirstTimeContributor: true,
      priorMergedPrs: 0,
      priorOpenPrs: 0,
      priorClosedUnmergedPrs: 0
    }
  };
}
