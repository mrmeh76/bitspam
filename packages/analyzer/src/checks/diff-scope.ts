import type { AnalyzerCheck, Finding } from "@bitspam/shared";

import { createFinding, totalChangedLines, touchedDirectories } from "./helpers.js";

export const diffScopeCheck: AnalyzerCheck = {
  id: "diff-scope",
  async run(context) {
    const findings: Finding[] = [];
    const fileCount = context.changedFiles.length;
    const changedLines = totalChangedLines(context);
    const directories = touchedDirectories(context);

    if (fileCount > 20 || changedLines > 1200) {
      findings.push(
        createFinding({
          checkId: "diff-scope",
          title: "Large diff needs scope explanation",
          severity: fileCount > 40 || changedLines > 2500 ? "high" : "medium",
          category: "scope",
          message: "The diff is large enough that maintainers need a clear review strategy.",
          evidence: [`${fileCount} files changed`, `${changedLines} changed lines`],
          recommendation: "Explain the review plan or split unrelated work into smaller PRs.",
          scoreImpact: fileCount > 40 || changedLines > 2500 ? 18 : 10
        })
      );
    }

    if (directories.length > 6) {
      findings.push(
        createFinding({
          checkId: "diff-scope",
          title: "Many top-level areas touched",
          severity: "medium",
          category: "scope",
          message: "The PR touches several areas, which increases review effort and risk.",
          evidence: [`Top-level areas: ${directories.join(", ")}`],
          recommendation: "Call out why each area changed, or split unrelated changes.",
          scoreImpact: 8
        })
      );
    }

    const hasLockfile = context.changedFiles.some((file) =>
      /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|Cargo\.lock|Gemfile\.lock)$/i.test(
        file.filename
      )
    );

    if (hasLockfile && !/\b(dependenc|lockfile|package|version|upgrade|bump)\b/i.test(context.body)) {
      findings.push(
        createFinding({
          checkId: "diff-scope",
          title: "Lockfile changed without explanation",
          severity: "medium",
          category: "scope",
          message: "A dependency lockfile changed, but the PR description does not explain why.",
          evidence: ["Dependency lockfile detected in changed files."],
          recommendation: "Explain the dependency change and why it is required.",
          scoreImpact: 10
        })
      );
    }

    return findings;
  }
};
