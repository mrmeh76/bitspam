import { URL } from "node:url";

export type ParsedGitHubPullRequestUrl = {
  owner: string;
  repo: string;
  number: number;
};

const githubNamePattern = /^[A-Za-z0-9_.-]+$/;

export function parseGitHubPullRequestUrl(
  input: string
): ParsedGitHubPullRequestUrl {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(input);
  } catch {
    throw new Error("Invalid GitHub pull request URL.");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error("GitHub pull request URL must use https.");
  }

  if (!["github.com", "www.github.com"].includes(parsedUrl.hostname)) {
    throw new Error("GitHub pull request URL must use github.com.");
  }

  const [owner, repo, pullSegment, numberSegment, ...extraSegments] =
    parsedUrl.pathname.split("/").filter(Boolean);

  if (
    !owner ||
    !repo ||
    pullSegment !== "pull" ||
    !numberSegment ||
    extraSegments.length > 0
  ) {
    throw new Error("Expected a GitHub pull request URL like https://github.com/owner/repo/pull/123.");
  }

  if (!githubNamePattern.test(owner) || !githubNamePattern.test(repo)) {
    throw new Error("GitHub owner and repository names contain invalid characters.");
  }

  const number = Number(numberSegment);

  if (!Number.isInteger(number) || number <= 0) {
    throw new Error("GitHub pull request number must be a positive integer.");
  }

  return {
    owner,
    repo,
    number
  };
}
