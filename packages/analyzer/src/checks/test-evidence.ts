import type { AnalyzerCheck, Finding } from "@bitspam/shared";

import { createFinding, hasTestLikeFile, mentionsTests } from "./helpers.js";

export const testEvidenceCheck: AnalyzerCheck = {
  id: "test-evidence",
  async run(context) {
    const findings: Finding[] = [];
    const bodyHasTestEvidence = mentionsTests(context.body);
    const diffHasTests = hasTestLikeFile(context);
    const ciHasSignal = context.checkRuns.length > 0;

    if (!bodyHasTestEvidence && !diffHasTests && !ciHasSignal && context.policy.requireTestEvidence) {
      findings.push(
        createFinding({
          checkId: "test-evidence",
          title: "No test evidence detected",
          severity: "medium",
          category: "tests",
          message: "The PR does not mention test commands, touch test files, or show visible CI signal.",
          evidence: ["No test files, test wording, or check runs were found."],
          recommendation: "Add the exact validation command or explain why tests are not applicable.",
          scoreImpact: 14
        })
      );
    }

    if (diffHasTests && !bodyHasTestEvidence) {
      findings.push(
        createFinding({
          checkId: "test-evidence",
          title: "Test files changed without validation notes",
          severity: "info",
          category: "tests",
          message: "Test-like files changed, but the PR body does not say what was run.",
          evidence: ["At least one test-like file was changed."],
          recommendation: "Mention the test command or CI run used to validate the change.",
          scoreImpact: 3
        })
      );
    }

    return findings;
  }
};
