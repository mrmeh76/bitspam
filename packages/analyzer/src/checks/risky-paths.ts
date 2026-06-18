import type { AnalyzerCheck, Finding } from "@bitspam/shared";

import { createFinding, matchesAnyPattern } from "./helpers.js";

const riskyPathPattern =
  /(^|\/)(\.github\/workflows|auth|security|crypto|wallet|consensus|permissions?|secrets?|migrations?|package\.json|pnpm-lock\.yaml|yarn\.lock|package-lock\.json)(\/|$)/i;

export const riskyPathsCheck: AnalyzerCheck = {
  id: "risky-paths",
  async run(context) {
    const riskyFiles = context.changedFiles
      .filter(
        (file) =>
          riskyPathPattern.test(file.filename) ||
          matchesAnyPattern(file.filename, context.policy.protectedPaths)
      )
      .map((file) => file.filename);

    if (riskyFiles.length === 0) {
      return [];
    }

    return [
      createFinding({
        checkId: "risky-paths",
        title: "Risk-sensitive files changed",
        severity: riskyFiles.length > 3 ? "high" : "medium",
        category: "risk",
        message: "The PR touches files that often require deeper maintainer review.",
        evidence: riskyFiles.slice(0, 8),
        recommendation: "Review these changes carefully and ask the contributor to explain the risk model.",
        scoreImpact: riskyFiles.length > 3 ? 18 : 10
      })
    ];
  }
};
