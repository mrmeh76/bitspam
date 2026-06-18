import type { AnalyzerCheck, Finding } from "@bitspam/shared";

import { createFinding, normalizeText } from "./helpers.js";

export const intentQualityCheck: AnalyzerCheck = {
  id: "intent-quality",
  async run(context) {
    const findings: Finding[] = [];
    const body = context.body.trim();
    const combinedText = normalizeText(context.title, context.body);

    if (context.title.trim().length < 12) {
      findings.push(
        createFinding({
          checkId: "intent-quality",
          title: "PR title is too terse",
          severity: "low",
          category: "intent",
          message: "The PR title does not give maintainers much context about the change.",
          evidence: [`Title: ${context.title}`],
          recommendation: "Use a title that names the problem or behavior being changed.",
          scoreImpact: 6
        })
      );
    }

    if (body.length < 80) {
      findings.push(
        createFinding({
          checkId: "intent-quality",
          title: "PR description needs more context",
          severity: "medium",
          category: "intent",
          message: "The PR body is short, so maintainers may need to infer the problem, approach, and validation.",
          evidence: [`Description length: ${body.length} characters`],
          recommendation: "Add a short problem statement, solution summary, and validation notes.",
          scoreImpact: 12
        })
      );
    }

    if (!/\b(why|because|fix|problem|issue|motivation|context|before|after)\b/i.test(combinedText)) {
      findings.push(
        createFinding({
          checkId: "intent-quality",
          title: "Motivation is unclear",
          severity: "low",
          category: "intent",
          message: "The PR text does not clearly explain why the change is needed.",
          evidence: ["No obvious motivation keywords were found in the title or body."],
          recommendation: "Explain the user-visible problem or maintenance reason for the change.",
          scoreImpact: 8
        })
      );
    }

    return findings;
  }
};
