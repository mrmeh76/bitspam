import type { AnalyzerCheck, Finding } from "@bitspam/shared";

import { createFinding, normalizeText } from "./helpers.js";

const genericPhrases = [
  "fix bug",
  "minor changes",
  "update files",
  "improve code",
  "please merge",
  "small fix",
  "changes made"
];

export const spamPatternsCheck: AnalyzerCheck = {
  id: "spam-patterns",
  async run(context) {
    const findings: Finding[] = [];
    const text = normalizeText(context.title, context.body).toLowerCase();
    const matchedPhrase = genericPhrases.find((phrase) => text.includes(phrase));
    const onlyDocs = context.changedFiles.every((file) =>
      /(^docs\/|\.md$|^README\.md$|^examples\/)/i.test(file.filename)
    );

    if (matchedPhrase && context.body.trim().length < 160) {
      findings.push(
        createFinding({
          checkId: "spam-patterns",
          title: "Generic PR wording",
          severity: "medium",
          category: "spam",
          message: "The PR uses generic wording without enough repository-specific evidence.",
          evidence: [`Matched phrase: ${matchedPhrase}`],
          recommendation: "Ask for concrete context about the bug, behavior, or docs being changed.",
          scoreImpact: 10
        })
      );
    }

    if (context.changedFiles.length > 0 && !onlyDocs && context.body.trim().length < 40) {
      findings.push(
        createFinding({
          checkId: "spam-patterns",
          title: "Non-docs change has almost no explanation",
          severity: "medium",
          category: "spam",
          message: "The PR changes code or configuration but gives almost no explanation.",
          evidence: [`Body length: ${context.body.trim().length} characters`],
          recommendation: "Ask the contributor to explain intent, scope, and validation.",
          scoreImpact: 12
        })
      );
    }

    return findings;
  }
};
