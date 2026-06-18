import type { Finding, FindingCategory, ScoreBreakdown } from "@bitspam/shared";

const findingCategories: FindingCategory[] = [
  "intent",
  "scope",
  "tests",
  "policy",
  "risk",
  "contributor",
  "spam",
  "ci",
  "maintainer_burden"
];

export function scoreFindings(findings: Finding[]): {
  score: number;
  scoreBreakdown: ScoreBreakdown;
} {
  const scoreBreakdown = createEmptyScoreBreakdown();
  let totalImpact = 0;

  for (const finding of findings) {
    const impact = Math.max(0, finding.scoreImpact);
    scoreBreakdown[finding.category] += impact;
    totalImpact += impact;
  }

  return {
    score: clampScore(100 - totalImpact),
    scoreBreakdown
  };
}

function createEmptyScoreBreakdown(): ScoreBreakdown {
  return Object.fromEntries(
    findingCategories.map((category) => [category, 0])
  ) as ScoreBreakdown;
}

function clampScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}
