import type { AnalyzerCheck, Finding } from "@bitspam/shared";

export const issueLinkCheck: AnalyzerCheck = {
  id: "issue-link",
  async run(context) {
    const findings: Finding[] = [];
    const hasIssueLink =
      context.linkedIssues.length > 0 ||
      /\b(close[sd]?|fix(?:e[sd])?|resolve[sd]?|refs?)\s+(?:#\d+|https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/issues\/\d+)/i.test(
        context.body
      );

    if (!hasIssueLink && context.policy.requireIssueLink) {
      findings.push({
        id: "issue-link:missing-linked-issue",
        checkId: "issue-link",
        title: "No linked issue or explicit problem reference",
        severity: "medium",
        category: "intent",
        message: "The PR does not link to an issue or use a clear fixes/closes reference.",
        evidence: ["No linked issue was detected in the PR body."],
        recommendation: "Link the relevant issue or explain the standalone problem this PR solves.",
        scoreImpact: 10
      });
    }

    return findings;
  }
};
