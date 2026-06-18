import type {
  AnalysisResult,
  AnalyzerCheck,
  Finding,
  PullRequestContext
} from "@bitspam/shared";

import { analyzerChecks } from "./checks.js";
import { scoreFindings } from "./scoring.js";
import { getVerdict } from "./verdict.js";

export async function analyzePullRequest(
  context: PullRequestContext,
  checks: AnalyzerCheck[] = analyzerChecks
): Promise<AnalysisResult> {
  const findings = await runChecks(context, checks);
  const { score, scoreBreakdown } = scoreFindings(findings);
  const verdict = getVerdict(score);

  return {
    score,
    verdict,
    summary: buildSummary(score, findings.length),
    findings,
    scoreBreakdown,
    suggestedContributorComment: buildSuggestedContributorComment(),
    maintainerRecommendation: buildMaintainerRecommendation(score)
  };
}

async function runChecks(
  context: PullRequestContext,
  checks: AnalyzerCheck[]
): Promise<Finding[]> {
  const findings = await Promise.all(checks.map((check) => check.run(context)));

  return findings.flat();
}

function buildSummary(score: number, findingCount: number): string {
  if (findingCount === 0) {
    return `BitSpam completed its foundation checks with a score of ${score}. No deterministic findings were produced yet.`;
  }

  return `BitSpam completed its foundation checks with a score of ${score} and ${findingCount} finding(s).`;
}

function buildSuggestedContributorComment(): string {
  return "Thanks for the pull request. Please add a short note explaining the problem solved, the test command you ran, and what the maintainer should focus on during review.";
}

function buildMaintainerRecommendation(score: number): string {
  if (score >= 80) {
    return "Ready for normal maintainer review.";
  }

  if (score >= 60) {
    return "Ask for small clarification or test evidence before deep review.";
  }

  if (score >= 40) {
    return "Ask the contributor for proof of work before spending significant maintainer time.";
  }

  return "Inspect cautiously before investing review time.";
}
