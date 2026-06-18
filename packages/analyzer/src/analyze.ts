import type {
  AISemanticResult,
  AnalysisResult,
  AnalyzerCheck,
  Finding,
  PullRequestContext
} from "@bitspam/shared";

import type { AIProvider } from "./ai/provider.js";
import { aiResultToFindings } from "./ai/findings.js";
import { analyzerChecks } from "./checks.js";
import { applyRepoPolicyConfig } from "./config.js";
import { scoreFindings } from "./scoring.js";
import { getVerdict } from "./verdict.js";

export type AnalyzePullRequestOptions = {
  checks?: AnalyzerCheck[];
  aiProvider?: AIProvider | undefined;
};

export async function analyzePullRequest(
  context: PullRequestContext,
  options: AnalyzePullRequestOptions | AnalyzerCheck[] = {}
): Promise<AnalysisResult> {
  const { checks, aiProvider } = normalizeOptions(options);
  const contextWithPolicy = applyRepoPolicyConfig(context);
  const deterministicFindings = await runChecks(contextWithPolicy, checks);
  const aiResult = await runAIProvider(contextWithPolicy, aiProvider);
  const aiFindings = aiResult ? aiResultToFindings(aiResult) : [];
  const findings = [...deterministicFindings, ...aiFindings];
  const { score, scoreBreakdown } = scoreFindings(findings);
  const verdict = getVerdict(score, contextWithPolicy.policy);

  return {
    score,
    verdict,
    summary: buildSummary(score, findings, aiResult),
    findings,
    scoreBreakdown,
    suggestedContributorComment: buildSuggestedContributorComment(contextWithPolicy, findings, aiResult),
    maintainerRecommendation: buildMaintainerRecommendation(score, findings, aiResult),
    ...(aiResult ? { ai: aiResult } : {})
  };
}

function normalizeOptions(
  options: AnalyzePullRequestOptions | AnalyzerCheck[]
): { checks: AnalyzerCheck[]; aiProvider: AIProvider | undefined } {
  if (Array.isArray(options)) {
    return { checks: options, aiProvider: undefined };
  }

  return {
    checks: options.checks ?? analyzerChecks,
    aiProvider: options.aiProvider
  };
}

async function runChecks(
  context: PullRequestContext,
  checks: AnalyzerCheck[]
): Promise<Finding[]> {
  const findings = await Promise.all(checks.map((check) => check.run(context)));

  return findings.flat();
}

async function runAIProvider(
  context: PullRequestContext,
  aiProvider?: AIProvider
): Promise<AISemanticResult | undefined> {
  if (!aiProvider) {
    return undefined;
  }

  try {
    return await aiProvider.analyzeSemanticRisk(context);
  } catch {
    return undefined;
  }
}

function buildSummary(
  score: number,
  findings: Finding[],
  aiResult?: AISemanticResult
): string {
  if (aiResult?.maintainerSummary) {
    return `BitSpam scored this PR at ${score}. ${aiResult.maintainerSummary}`;
  }

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
  findings: Finding[],
  aiResult?: AISemanticResult
): string {
  if (findings.length === 0) {
    return "Thanks for the pull request. This looks ready for maintainer review from BitSpam's deterministic checks. Please keep the description and validation notes up to date if the PR changes.";
  }

  const recommendations = findings
    .filter((finding) => finding.severity !== "info")
    .slice(0, 3)
    .map((finding) => `- ${finding.recommendation}`);
  const proofQuestions = [
    ...(aiResult?.suggestedProofQuestions ?? []),
    ...context.policy.proofOfWorkQuestions
  ].slice(0, 3);

  return [
    "Thanks for the pull request. Before a maintainer spends deeper review time, please add a short update with:",
    ...recommendations,
    ...proofQuestions.map((question) => `- ${question}`)
  ].join("\n");
}

function buildMaintainerRecommendation(
  score: number,
  findings: Finding[],
  aiResult?: AISemanticResult
): string {
  const highSignalFindings = findings
    .filter((finding) => ["high", "critical"].includes(finding.severity))
    .map((finding) => finding.title);
  const aiContext = aiResult ? ` AI confidence: ${Math.round(aiResult.confidence * 100)}%.` : "";

  if (score >= 80) {
    return `Ready for normal maintainer review. Skim the findings for minor evidence gaps.${aiContext}`;
  }

  if (score >= 60) {
    return `Ask for small clarification or test evidence before deep review.${aiContext}`;
  }

  if (score >= 40) {
    return `Ask the contributor for proof of work before spending significant maintainer time.${formatHighSignalFindings(highSignalFindings)}${aiContext}`;
  }

  return `Inspect cautiously before investing review time.${formatHighSignalFindings(highSignalFindings)}${aiContext}`;
}

function formatHighSignalFindings(findings: string[]): string {
  if (findings.length === 0) {
    return "";
  }

  return ` Highest-signal issues: ${findings.slice(0, 3).join("; ")}.`;
}
