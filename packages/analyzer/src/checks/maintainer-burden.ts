import type { AnalyzerCheck } from "@bitspam/shared";

import { createFinding, totalChangedLines, touchedDirectories } from "./helpers.js";

export const maintainerBurdenCheck: AnalyzerCheck = {
  id: "maintainer-burden",
  async run(context) {
    const changedLines = totalChangedLines(context);
    const directories = touchedDirectories(context).length;
    const firstTimer = context.contributorStats.isFirstTimeContributor;
    const missingContext = context.body.trim().length < 120;

    if (changedLines < 300 && directories <= 3 && !missingContext) {
      return [];
    }

    const evidence = [
      `${changedLines} changed lines`,
      `${directories} top-level area(s)`,
      firstTimer ? "first-time or no prior merged PRs detected" : "prior merged PRs detected"
    ];

    return [
      createFinding({
        checkId: "maintainer-burden",
        title: "Maintainer review burden needs proof of work",
        severity: changedLines > 1000 || missingContext ? "medium" : "low",
        category: "maintainer_burden",
        message: "This PR may require extra maintainer attention before it is ready for deep review.",
        evidence,
        recommendation: "Ask for a concise scope explanation, validation command, and review focus.",
        scoreImpact: changedLines > 1000 || missingContext ? 10 : 5
      })
    ];
  }
};
