import type { AnalyzerCheck } from "@bitspam/shared";

import { createFinding } from "./helpers.js";

export const ciStatusCheck: AnalyzerCheck = {
  id: "ci-status",
  async run(context) {
    const checks = context.checkRuns;

    if (checks.length === 0) {
      return [
        createFinding({
          checkId: "ci-status",
          title: "No visible CI status",
          severity: "low",
          category: "ci",
          message: "No GitHub check runs or commit statuses were visible for the PR head SHA.",
          evidence: [`Head SHA: ${context.headSha}`],
          recommendation: "If this repository uses CI, wait for checks or ask the contributor for validation notes.",
          scoreImpact: 5
        })
      ];
    }

    const failed = checks.filter((check) =>
      ["failure", "cancelled", "timed_out", "action_required", "error"].includes(
        check.conclusion ?? ""
      )
    );
    const pending = checks.filter((check) =>
      ["queued", "in_progress", "waiting", "pending"].includes(check.status)
    );

    if (failed.length > 0) {
      return [
        createFinding({
          checkId: "ci-status",
          title: "CI has failing checks",
          severity: "high",
          category: "ci",
          message: "One or more visible checks did not pass.",
          evidence: failed.slice(0, 6).map((check) => `${check.name}: ${check.conclusion}`),
          recommendation: "Ask the contributor to address failing checks before deep review.",
          scoreImpact: 18
        })
      ];
    }

    if (pending.length > 0) {
      return [
        createFinding({
          checkId: "ci-status",
          title: "CI is still pending",
          severity: "low",
          category: "ci",
          message: "Some visible checks have not completed yet.",
          evidence: pending.slice(0, 6).map((check) => `${check.name}: ${check.status}`),
          recommendation: "Wait for checks to complete before final review.",
          scoreImpact: 4
        })
      ];
    }

    return [];
  }
};
