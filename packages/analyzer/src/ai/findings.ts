import type { AISemanticResult, Finding } from "@bitspam/shared";

import { createFinding } from "../checks/helpers.js";

export function aiResultToFindings(result: AISemanticResult): Finding[] {
  const findings: Finding[] = [];

  if (!result.bodyMatchesDiff && result.confidence >= 0.55) {
    findings.push(
      createFinding({
        checkId: "ai-semantic-risk",
        title: "PR description may not match the diff",
        severity: result.confidence >= 0.8 ? "high" : "medium",
        category: "intent",
        message: "AI semantic review found a possible mismatch between the PR description and changed files.",
        evidence: [result.maintainerSummary],
        recommendation: "Ask the contributor to explain how the changed files implement the stated goal.",
        scoreImpact: result.confidence >= 0.8 ? 12 : 8
      })
    );
  }

  if (result.genericDescriptionRisk !== "low") {
    findings.push(
      createFinding({
        checkId: "ai-semantic-risk",
        title: "PR description reads generic",
        severity: result.genericDescriptionRisk === "high" ? "medium" : "low",
        category: "spam",
        message: "AI semantic review rated the PR body as generic or low-effort.",
        evidence: [`Generic description risk: ${result.genericDescriptionRisk}`],
        recommendation: "Ask for repository-specific context, validation, and reviewer focus.",
        scoreImpact: result.genericDescriptionRisk === "high" ? 8 : 4
      })
    );
  }

  if (result.suspiciousClaims.length > 0) {
    findings.push(
      createFinding({
        checkId: "ai-semantic-risk",
        title: "PR claims need verification",
        severity: "medium",
        category: "intent",
        message: "AI semantic review found claims that may need maintainer verification.",
        evidence: result.suspiciousClaims.slice(0, 4),
        recommendation: "Ask the contributor to back these claims with issue links, tests, screenshots, or exact commands.",
        scoreImpact: Math.min(10, result.suspiciousClaims.length * 3)
      })
    );
  }

  return capAIImpact(findings, 20);
}

function capAIImpact(findings: Finding[], maxImpact: number): Finding[] {
  let remaining = maxImpact;

  return findings.map((finding) => {
    const scoreImpact = Math.min(finding.scoreImpact, remaining);
    remaining -= scoreImpact;

    return {
      ...finding,
      scoreImpact
    };
  });
}
