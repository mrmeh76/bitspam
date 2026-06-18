import { describe, expect, it } from "vitest";

import type { PullRequestContext, RepoPolicy } from "@bitspam/shared";

import { analyzePullRequest } from "./analyze.js";
import { parseRepoPolicyConfig } from "./config.js";

const basePolicy: RepoPolicy = {
  mode: "advisory",
  thresholds: {
    reviewReady: 80,
    needsEvidence: 60,
    possibleSpam: 40
  },
  protectedPaths: [
    ".github/workflows/**",
    "src/consensus/**",
    "src/wallet/**",
    "crypto/**",
    "package.json",
    "pnpm-lock.yaml"
  ],
  lowRiskPaths: ["docs/**", "README.md"],
  requireIssueLink: true,
  requireTestEvidence: true,
  postSummaryComment: true,
  addLabels: true,
  createCheckRun: true,
  autoClose: false,
  proofOfWorkQuestions: [
    "Which issue or problem does this PR solve?",
    "What exact command did you run to test this change?",
    "Why did these specific files need to change?"
  ]
};

describe("analyzePullRequest", () => {
  it("keeps a well-described tested PR review-ready", async () => {
    const result = await analyzePullRequest(
      createContext({
        title: "Fix wallet balance rounding in transaction summary",
        body: [
          "## Summary",
          "Fixes #42 by correcting a rounding issue in the transaction summary.",
          "## Testing",
          "Ran pnpm test and verified the existing wallet summary fixture."
        ].join("\n\n"),
        linkedIssues: [{ number: 42, title: "Rounding issue", state: "open" }],
        changedFiles: [
          {
            filename: "src/wallet/summary.ts",
            status: "modified",
            additions: 8,
            deletions: 3,
            changes: 11,
            patch: "+ return roundBalance(balance)"
          },
          {
            filename: "src/wallet/summary.test.ts",
            status: "modified",
            additions: 14,
            deletions: 0,
            changes: 14,
            patch: "+ expect(summary.balance).toBe('1.23')"
          }
        ],
        checkRuns: [{ name: "CI", status: "completed", conclusion: "success" }],
        contributorStats: {
          isFirstTimeContributor: false,
          priorMergedPrs: 2,
          priorOpenPrs: 1,
          priorClosedUnmergedPrs: 0
        }
      })
    );

    expect(result.verdict).toBe("review_ready");
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.findings.some((finding) => finding.checkId === "test-evidence")).toBe(false);
  });

  it("produces proof-of-work findings for low-context risky PRs", async () => {
    const result = await analyzePullRequest(
      createContext({
        title: "fix bug",
        body: "minor changes",
        changedFiles: [
          {
            filename: ".github/workflows/build.yml",
            status: "modified",
            additions: 50,
            deletions: 10,
            changes: 60,
            patch: "+ pull_request_target:"
          },
          {
            filename: "src/consensus/validation.ts",
            status: "modified",
            additions: 200,
            deletions: 100,
            changes: 300,
            patch: "+ if (valid) return true"
          }
        ],
        checkRuns: []
      })
    );

    expect(result.score).toBeLessThan(60);
    expect(result.verdict).toBe("high_risk");
    expect(result.findings.map((finding) => finding.checkId)).toEqual(
      expect.arrayContaining(["intent-quality", "test-evidence", "risky-paths", "spam-patterns"])
    );
    expect(result.suggestedContributorComment).toContain("Before a maintainer spends deeper review time");
  });

  it("applies .bitspam.yml thresholds and policy toggles", async () => {
    const result = await analyzePullRequest(
      createContext({
        title: "Update README installation note",
        body: [
          "## Summary",
          "Clarifies setup context for new users because the existing README skipped one install detail.",
          "## Testing",
          "Docs-only change. Verified the rendered README instructions still read in order."
        ].join("\n\n"),
        repoFiles: {
          bitspamConfig: [
            "version: 1",
            "preset: bitcoin-open-source",
            "thresholds:",
            "  review_ready: 90",
            "  needs_evidence: 70",
            "  possible_spam: 50",
            "checks:",
            "  require_issue_link: false",
            "  require_test_evidence: false"
          ].join("\n")
        },
        changedFiles: [
          {
            filename: "README.md",
            status: "modified",
            additions: 3,
            deletions: 1,
            changes: 4,
            patch: "+ clearer setup note"
          }
        ],
        checkRuns: [{ name: "CI", status: "completed", conclusion: "success" }],
        contributorStats: {
          isFirstTimeContributor: false,
          priorMergedPrs: 1,
          priorOpenPrs: 0,
          priorClosedUnmergedPrs: 0
        }
      })
    );

    expect(result.findings.some((finding) => finding.checkId === "issue-link")).toBe(false);
    expect(result.findings.some((finding) => finding.checkId === "test-evidence")).toBe(false);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.verdict).toBe("review_ready");
  });
});

describe("parseRepoPolicyConfig", () => {
  it("parses bitcoin open-source preset and snake_case config", () => {
    const policy = parseRepoPolicyConfig([
      "version: 1",
      "preset: bitcoin-open-source",
      "mode: strict",
      "thresholds:",
      "  review_ready: 85",
      "  needs_evidence: 65",
      "  possible_spam: 45",
      "automation:",
      "  auto_close: false"
    ].join("\n"));

    expect(policy.mode).toBe("strict");
    expect(policy.thresholds?.reviewReady).toBe(85);
    expect(policy.protectedPaths).toContain("src/consensus/**");
    expect(policy.autoClose).toBe(false);
  });
});

function createContext(
  overrides: Partial<PullRequestContext> = {}
): PullRequestContext {
  return {
    owner: "bitcoin",
    repo: "demo",
    number: 1,
    title: "Improve pull request",
    body: "",
    authorLogin: "contributor",
    authorAssociation: "CONTRIBUTOR",
    headSha: "head",
    baseSha: "base",
    changedFiles: [],
    commits: [{ sha: "abc", message: "Improve pull request" }],
    comments: [],
    linkedIssues: [],
    checkRuns: [],
    ...overrides,
    repoFiles: {
      ...overrides.repoFiles
    },
    contributorStats: {
      ...basePolicyContributorStats,
      ...overrides.contributorStats
    },
    policy: {
      ...basePolicy,
      ...overrides.policy,
      thresholds: {
        ...basePolicy.thresholds,
        ...overrides.policy?.thresholds
      }
    }
  };
}

const basePolicyContributorStats = {
  isFirstTimeContributor: true,
  priorMergedPrs: 0,
  priorOpenPrs: 1,
  priorClosedUnmergedPrs: 0
};
