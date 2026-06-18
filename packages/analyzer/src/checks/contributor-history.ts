import type { AnalyzerCheck } from "@bitspam/shared";

import { createFinding } from "./helpers.js";

export const contributorHistoryCheck: AnalyzerCheck = {
  id: "contributor-history",
  async run(context) {
    const stats = context.contributorStats;
    const findings = [];

    if (stats.isFirstTimeContributor) {
      findings.push(
        createFinding({
          checkId: "contributor-history",
          title: "First-time contributor needs clear evidence",
          severity: "info",
          category: "contributor",
          message: "This appears to be a first-time or no-prior-merged contributor for this repository.",
          evidence: [
            `${stats.priorMergedPrs} prior merged PRs`,
            `${stats.priorClosedUnmergedPrs} prior closed unmerged PRs`
          ],
          recommendation: "Do not penalize the contributor, but ask for clear intent and test evidence before deep review.",
          scoreImpact: context.body.trim().length < 120 ? 4 : 0
        })
      );
    }

    if (stats.priorClosedUnmergedPrs >= 3 && stats.priorMergedPrs === 0) {
      findings.push(
        createFinding({
          checkId: "contributor-history",
          title: "Prior unmerged PR pattern",
          severity: "medium",
          category: "contributor",
          message: "The contributor has several previously closed unmerged PRs and no detected merged PRs in this repo.",
          evidence: [`Closed unmerged PRs: ${stats.priorClosedUnmergedPrs}`],
          recommendation: "Ask for stronger proof of work and confirm the change fits maintainer priorities.",
          scoreImpact: 8
        })
      );
    }

    return findings;
  }
};
