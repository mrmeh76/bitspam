import type { AnalyzerCheck, Finding } from "@bitspam/shared";

import { createFinding } from "./helpers.js";

const checkboxPattern = /-\s+\[( |x)\]\s+(.+)/gi;
const headingPattern = /^#{1,4}\s+(.+)$/gim;

export const prTemplateCheck: AnalyzerCheck = {
  id: "pr-template",
  async run(context) {
    const findings: Finding[] = [];
    const template = context.repoFiles.pullRequestTemplate;

    if (!template) {
      return findings;
    }

    const headings = [...template.matchAll(headingPattern)].map((match) =>
      match[1]?.trim().toLowerCase()
    );
    const missingHeadings = headings.filter((heading) => {
      if (!heading) return false;
      if (/checklist|notes?|screenshots?/.test(heading)) return false;

      return !new RegExp(escapeRegExp(heading), "i").test(context.body);
    });

    if (missingHeadings.length > 0) {
      findings.push(
        createFinding({
          checkId: "pr-template",
          title: "PR template sections appear incomplete",
          severity: "medium",
          category: "policy",
          message: "The repository has a PR template, but the PR body appears to skip one or more important sections.",
          evidence: missingHeadings.slice(0, 5).map((heading) => `Missing section: ${heading}`),
          recommendation: "Fill in the repository's PR template sections before maintainer review.",
          scoreImpact: 10
        })
      );
    }

    const uncheckedItems = [...context.body.matchAll(checkboxPattern)].filter(
      (match) => match[1] === " "
    );
    if (uncheckedItems.length > 0) {
      findings.push(
        createFinding({
          checkId: "pr-template",
          title: "PR checklist has unchecked items",
          severity: "low",
          category: "policy",
          message: "The PR body includes unchecked checklist items.",
          evidence: uncheckedItems
            .slice(0, 5)
            .map((match) => `Unchecked: ${match[2]?.trim() ?? "checklist item"}`),
          recommendation: "Complete checklist items or explain why they do not apply.",
          scoreImpact: 5
        })
      );
    }

    return findings;
  }
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
