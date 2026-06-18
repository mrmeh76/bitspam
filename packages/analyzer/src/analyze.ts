import type {
  AnalysisResult,
  AnalyzerCheck,
  Finding,
  PullRequestContext
} from "@bitspam/shared";

import { analyzerChecks } from "./checks.js";
import { applyRepoPolicyConfig } from "./config.js";
import { scoreFindings } from "./scoring.js";
import { getVerdict } from "./verdict.js";

export async function analyzePullRequest(
  context: PullRequestContext,
  checks: AnalyzerCheck[] = analyzerChecks
): Promise<AnalysisResult> {
  const contextWithPolicy = applyRepoPolicyConfig(context);
  const findings = await runChecks(contextWithPolicy, checks);
  const { score, scoreBreakdown } = scoreFindings(findings);
  const verdict = getVerdict(score, contextWithPolicy.policy);

  return {
    score,
    verdict,
    summary: buildSummary(score, findings),
    findings,
    scoreBreakdown,
    suggestedContributorComment: buildSuggestedContributorComment(contextWithPolicy, findings),
    maintainerRecommendation: buildMaintainerRecommendation(score, findings)
  };
}

async function runChecks(
  context: PullRequestContext,
  checks: AnalyzerCheck[]
): Promise<Finding[]> {
  const findings = await Promise.all(checks.map((check) => check.run(context)));

  return findings.flat();
}

function buildSummary(score: number, findings: Finding[]): string {
  if (findings.length === 0) {
    return `BitSpam scored this PR at ${score}. No maintainer-burden signals were found by deterministic checks.`;
  }

  const topCategories = [...new Set(findings.map((finding) => finding.category))]
    .slice(0, 3)
    .map((category) => category.replaceAll("_", " "));

  return `BitSpam scored this PR at ${score} with ${findings.length} finding(s), led by ${topCategories.join(", ")}.`;
}

function buildSuggestedContributorComment(
  context: PullRequestContext,
  findings: Finding[]
): string {
  if (findings.length === 0) {
    return "Thanks for the pull request. This looks ready for maintainer review from BitSpam's deterministic checks. Please keep the description and validation notes up to date if the PR changes.";
  }

  const recommendations = findings
    .filter((finding) => finding.severity !== "info")
    .slice(0, 3)
    .map((finding) => `- ${finding.recommendation}`);
  const proofQuestions = context.policy.proofOfWorkQuestions.slice(0, 3);

  return [
    "Thanks for the pull request. Before a maintainer spends deeper review time, please add a short update with:",
    ...recommendations,
    ...proofQuestions.map((question) => `- ${question}`)
  ].join("\n");
}

function buildMaintainerRecommendation(score: number, findings: Finding[]): string {
  const highSignalFindings = findings
    .filter((finding) => ["high", "critical"].includes(finding.severity))
    .map((finding) => finding.title);

  if (score >= 80) {
    return "Ready for normal maintainer review. Skim the findings for minor evidence gaps.";
  }

  if (score >= 60) {
    return "Ask for small clarification or test evidence before deep review.";
  }

  if (score >= 40) {
    return `Ask the contributor for proof of work before spending significant maintainer time.${formatHighSignalFindings(highSignalFindings)}`;
  }

  return `Inspect cautiously before investing review time.${formatHighSignalFindings(highSignalFindings)}`;
}

function formatHighSignalFindings(findings: string[]): string {
  if (findings.length === 0) {
    return "";
  }

  return ` Highest-signal issues: ${findings.slice(0, 3).join("; ")}.`;
}
