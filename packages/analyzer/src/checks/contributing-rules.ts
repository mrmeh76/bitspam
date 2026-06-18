import type { AnalyzerCheck, Finding } from "@bitspam/shared";

import { createFinding, mentionsTests } from "./helpers.js";

const signoffPattern = /signed-off-by:/i;
const issueFirstPattern = /\b(open|file|create)\s+(an?\s+)?issue\b|\bissue\s+first\b/i;

export const contributingRulesCheck: AnalyzerCheck = {
  id: "contributing-rules",
  async run(context) {
    const findings: Finding[] = [];
    const contributing = context.repoFiles.contributing;

    if (!contributing) {
      return findings;
    }

    if (mentionsTests(contributing) && !mentionsTests(context.body)) {
      findings.push(
        createFinding({
          checkId: "contributing-rules",
          title: "CONTRIBUTING asks for tests",
          severity: "medium",
          category: "policy",
          message: "The repository guidance appears to ask for tests or validation, but the PR body does not mention what was run.",
          evidence: ["CONTRIBUTING contains test guidance."],
          recommendation: "Add the exact test or validation command, or explain why it was not applicable.",
          scoreImpact: 9
        })
      );
    }

    if (signoffPattern.test(contributing) && !signoffPattern.test(context.body)) {
      findings.push(
        createFinding({
          checkId: "contributing-rules",
          title: "Signed-off-by may be required",
          severity: "low",
          category: "policy",
          message: "The repository guidance mentions Signed-off-by, but the PR body does not include one.",
          evidence: ["Signed-off-by found in CONTRIBUTING guidance."],
          recommendation: "Add the required sign-off if this repository enforces DCO-style contributions.",
          scoreImpact: 5
        })
      );
    }

    if (issueFirstPattern.test(contributing) && context.linkedIssues.length === 0) {
      findings.push(
        createFinding({
          checkId: "contributing-rules",
          title: "Repository may expect issue-first workflow",
          severity: "medium",
          category: "policy",
          message: "The repository guidance appears to ask contributors to open an issue before submitting changes.",
          evidence: ["Issue-first language found in CONTRIBUTING guidance."],
          recommendation: "Link the prior issue or explain why this PR can stand alone.",
          scoreImpact: 8
        })
      );
    }

    return findings;
  }
};
