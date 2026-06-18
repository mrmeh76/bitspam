import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { verifyGitHubWebhookSignature } from "./app-auth.js";
import {
  isPullRequestWebhookPayload,
  shouldAnalyzePullRequestAction
} from "./webhooks.js";

describe("verifyGitHubWebhookSignature", () => {
  it("accepts valid sha256 signatures", () => {
    const body = JSON.stringify({ action: "opened" });
    const secret = "test-secret";
    const signature256 = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

    expect(verifyGitHubWebhookSignature(body, secret, { signature256 })).toBe(true);
  });

  it("rejects invalid signatures", () => {
    expect(
      verifyGitHubWebhookSignature("{}", "test-secret", {
        signature256: "sha256=bad"
      })
    ).toBe(false);
  });
});

describe("pull_request webhook guards", () => {
  it("accepts the minimal pull_request payload BitSpam needs", () => {
    expect(
      isPullRequestWebhookPayload({
        action: "opened",
        installation: { id: 1 },
        repository: {
          id: 2,
          name: "repo",
          full_name: "owner/repo",
          private: false,
          owner: { login: "owner" }
        },
        pull_request: {
          number: 3,
          html_url: "https://github.com/owner/repo/pull/3",
          title: "Improve docs",
          state: "open",
          user: { login: "contributor" },
          head: { sha: "head" },
          base: { sha: "base" }
        }
      })
    ).toBe(true);
  });

  it("only analyzes actionable non-draft pull request events", () => {
    expect(shouldAnalyzePullRequestAction("opened", false)).toBe(true);
    expect(shouldAnalyzePullRequestAction("synchronize", false)).toBe(true);
    expect(shouldAnalyzePullRequestAction("closed", false)).toBe(false);
    expect(shouldAnalyzePullRequestAction("opened", true)).toBe(false);
  });
});
