import type { AnalysisResult, Verdict } from "@bitspam/shared";
import { createAppAuth } from "@octokit/auth-app";

import {
  createInstallationOctokit,
  normalizePrivateKey,
  type GitHubAppCredentials
} from "./app-auth.js";

export type PullRequestTarget = {
  owner: string;
  repo: string;
  number: number;
};

export type CreateBitSpamCheckRunInput = PullRequestTarget & {
  installationId: string | number;
  headSha: string;
  detailsUrl?: string | undefined;
  credentials: GitHubAppCredentials;
};

export type UpdateBitSpamCheckRunInput = PullRequestTarget & {
  installationId: string | number;
  checkRunId: string | number;
  result: AnalysisResult;
  detailsUrl?: string | undefined;
  credentials: GitHubAppCredentials;
};

export type FailBitSpamCheckRunInput = PullRequestTarget & {
  installationId: string | number;
  checkRunId: string | number;
  error: string;
  detailsUrl?: string | undefined;
  credentials: GitHubAppCredentials;
};

export type ApplyBitSpamReviewActionsInput = PullRequestTarget & {
  installationId: string | number;
  result: AnalysisResult;
  commentBody?: string | undefined;
  credentials: GitHubAppCredentials;
};

export async function getInstallationAccessToken(
  credentials: GitHubAppCredentials,
  installationId: string | number
): Promise<string> {
  const auth = createAppAuth({
    appId: credentials.appId,
    privateKey: normalizePrivateKey(credentials.privateKey)
  });
  const installationAuthentication = await auth({
    type: "installation",
    installationId: Number(installationId)
  });

  return installationAuthentication.token;
}

export async function createBitSpamCheckRun({
  credentials,
  installationId,
  owner,
  repo,
  headSha,
  detailsUrl
}: CreateBitSpamCheckRunInput): Promise<number> {
  const octokit = await createInstallationOctokit(credentials, installationId);
  const { data } = await octokit.checks.create({
    owner,
    repo,
    name: "BitSpam",
    head_sha: headSha,
    status: "queued",
    started_at: new Date().toISOString(),
    ...(detailsUrl ? { details_url: detailsUrl } : {})
  });

  return data.id;
}

export async function updateBitSpamCheckRun({
  credentials,
  installationId,
  owner,
  repo,
  checkRunId,
  result,
  detailsUrl
}: UpdateBitSpamCheckRunInput): Promise<void> {
  const octokit = await createInstallationOctokit(credentials, installationId);
  await octokit.checks.update({
    owner,
    repo,
    check_run_id: Number(checkRunId),
    status: "completed",
    conclusion: verdictToCheckConclusion(result.verdict),
    completed_at: new Date().toISOString(),
    ...(detailsUrl ? { details_url: detailsUrl } : {}),
    output: {
      title: `BitSpam score: ${result.score}/100`,
      summary: result.summary,
      text: formatCheckRunText(result)
    }
  });
}

export async function failBitSpamCheckRun({
  credentials,
  installationId,
  owner,
  repo,
  checkRunId,
  error,
  detailsUrl
}: FailBitSpamCheckRunInput): Promise<void> {
  const octokit = await createInstallationOctokit(credentials, installationId);
  await octokit.checks.update({
    owner,
    repo,
    check_run_id: Number(checkRunId),
    status: "completed",
    conclusion: "failure",
    completed_at: new Date().toISOString(),
    ...(detailsUrl ? { details_url: detailsUrl } : {}),
    output: {
      title: "BitSpam analysis failed",
      summary: error,
      text: "BitSpam could not complete analysis for this pull request."
    }
  });
}

export async function applyBitSpamReviewActions({
  credentials,
  installationId,
  owner,
  repo,
  number,
  result,
  commentBody
}: ApplyBitSpamReviewActionsInput): Promise<{ commentId?: number | undefined }> {
  const octokit = await createInstallationOctokit(credentials, installationId);
  const labels = labelsForResult(result);

  if (labels.length > 0) {
    await Promise.all(labels.map((label) => ensureLabel(octokit, owner, repo, label)));
    await octokit.issues.addLabels({
      owner,
      repo,
      issue_number: number,
      labels
    });
  }

  if (commentBody) {
    const { data } = await octokit.issues.createComment({
      owner,
      repo,
      issue_number: number,
      body: commentBody
    });

    return { commentId: data.id };
  }

  return {};
}

async function ensureLabel(
  octokit: Awaited<ReturnType<typeof createInstallationOctokit>>,
  owner: string,
  repo: string,
  name: string
): Promise<void> {
  try {
    await octokit.issues.createLabel({
      owner,
      repo,
      name,
      color: labelColor(name),
      description: "Applied by BitSpam pull request analysis."
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "status" in error) {
      const status = (error as { status?: unknown }).status;

      if (status === 422) {
        return;
      }
    }

    throw error;
  }
}

function verdictToCheckConclusion(
  verdict: Verdict
): "success" | "neutral" | "action_required" | "failure" {
  switch (verdict) {
    case "review_ready":
      return "success";
    case "needs_small_fixes":
      return "neutral";
    case "needs_proof_of_work":
      return "action_required";
    case "likely_low_quality":
    case "high_risk":
      return "failure";
  }
}

function labelsForResult(result: AnalysisResult): string[] {
  switch (result.verdict) {
    case "review_ready":
      return ["bitspam: review-ready"];
    case "needs_small_fixes":
      return ["bitspam: needs-small-fixes"];
    case "needs_proof_of_work":
      return ["bitspam: proof-needed"];
    case "likely_low_quality":
      return ["bitspam: likely-low-quality"];
    case "high_risk":
      return ["bitspam: high-risk"];
  }
}

function labelColor(name: string): string {
  if (name.includes("review-ready")) {
    return "2da44e";
  }

  if (name.includes("proof") || name.includes("small")) {
    return "bf8700";
  }

  return "cf222e";
}

function formatCheckRunText(result: AnalysisResult): string {
  const findings = result.findings
    .slice(0, 8)
    .map((finding) => `- ${finding.title}: ${finding.recommendation}`)
    .join("\n");

  return [
    result.maintainerRecommendation,
    "",
    findings ? "Findings:" : "No findings.",
    findings
  ].filter(Boolean).join("\n");
}
