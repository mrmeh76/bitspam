import { Buffer } from "node:buffer";

import { Octokit } from "@octokit/rest";

import type {
  ChangedFile,
  CheckRunInfo,
  CommentInfo,
  CommitInfo,
  ContributorStats,
  LinkedIssue,
  PullRequestContext,
  RepoPolicy
} from "@bitspam/shared";

import { parseGitHubPullRequestUrl } from "./parse-pr-url.js";

export type ParsedPullRequestLocation = {
  owner: string;
  repo: string;
  number: number;
};

export type FetchPullRequestContextOptions = {
  githubToken?: string | undefined;
};

export async function fetchPullRequestContextFromUrl(
  url: string,
  options: FetchPullRequestContextOptions = {}
): Promise<PullRequestContext> {
  const location = parseGitHubPullRequestUrl(url);

  return fetchPullRequestContext(location, options);
}

export async function fetchPullRequestContext(
  { owner, repo, number }: ParsedPullRequestLocation,
  options: FetchPullRequestContextOptions = {}
): Promise<PullRequestContext> {
  const octokit = createOctokit(options.githubToken);
  const { data: pullRequest } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: number
  });

  const [changedFiles, commits, comments, checkRuns, repoFiles, linkedIssues, contributorStats] =
    await Promise.all([
      fetchChangedFiles(octokit, owner, repo, number),
      fetchCommits(octokit, owner, repo, number),
      fetchComments(octokit, owner, repo, number),
      fetchCheckRuns(octokit, owner, repo, pullRequest.head.sha),
      fetchRepoFiles(octokit, owner, repo, pullRequest.base.ref),
      fetchLinkedIssues(octokit, owner, repo, pullRequest.body ?? ""),
      fetchContributorStats(octokit, owner, repo, pullRequest.user?.login ?? "")
    ]);

  return {
    owner,
    repo,
    number,
    title: pullRequest.title,
    body: pullRequest.body ?? "",
    authorLogin: pullRequest.user?.login ?? "unknown",
    authorAssociation: pullRequest.author_association,
    createdAt: pullRequest.created_at,
    updatedAt: pullRequest.updated_at,
    headSha: pullRequest.head.sha,
    baseSha: pullRequest.base.sha,
    changedFiles,
    commits,
    comments,
    linkedIssues,
    checkRuns,
    repoFiles,
    contributorStats,
    policy: defaultRepoPolicy
  };
}

function createOctokit(githubToken?: string): Octokit {
  if (
    process.env.BITSPAM_ALLOW_INSECURE_GITHUB_TLS === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  return new Octokit({
    auth: githubToken || undefined,
    userAgent: "BitSpam Phase 1"
  });
}

async function fetchChangedFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  number: number
): Promise<ChangedFile[]> {
  const files = await octokit.paginate(octokit.pulls.listFiles, {
    owner,
    repo,
    pull_number: number,
    per_page: 100
  });

  return files.map((file) => {
    const changedFile: ChangedFile = {
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes
    };

    if (file.patch) {
      changedFile.patch = file.patch;
    }

    return changedFile;
  });
}

async function fetchCommits(
  octokit: Octokit,
  owner: string,
  repo: string,
  number: number
): Promise<CommitInfo[]> {
  const commits = await octokit.paginate(octokit.pulls.listCommits, {
    owner,
    repo,
    pull_number: number,
    per_page: 100
  });

  return commits.map((commit) => {
    const commitInfo: CommitInfo = {
      sha: commit.sha,
      message: commit.commit.message
    };

    const author = commit.commit.author?.name ?? commit.author?.login;
    if (author) {
      commitInfo.author = author;
    }

    return commitInfo;
  });
}

async function fetchComments(
  octokit: Octokit,
  owner: string,
  repo: string,
  number: number
): Promise<CommentInfo[]> {
  const comments = await octokit.paginate(octokit.issues.listComments, {
    owner,
    repo,
    issue_number: number,
    per_page: 100
  });

  return comments.map((comment) => ({
    author: comment.user?.login ?? "unknown",
    body: comment.body ?? "",
    createdAt: comment.created_at
  }));
}

async function fetchCheckRuns(
  octokit: Octokit,
  owner: string,
  repo: string,
  headSha: string
): Promise<CheckRunInfo[]> {
  const checks = await getCheckRuns(octokit, owner, repo, headSha);
  const statuses = await getCommitStatuses(octokit, owner, repo, headSha);

  return [...checks, ...statuses];
}

async function getCheckRuns(
  octokit: Octokit,
  owner: string,
  repo: string,
  headSha: string
): Promise<CheckRunInfo[]> {
  try {
    const { data } = await octokit.checks.listForRef({
      owner,
      repo,
      ref: headSha,
      per_page: 100
    });

    return data.check_runs.map((checkRun) => ({
      name: checkRun.name,
      status: checkRun.status,
      conclusion: checkRun.conclusion
    }));
  } catch {
    return [];
  }
}

async function getCommitStatuses(
  octokit: Octokit,
  owner: string,
  repo: string,
  headSha: string
): Promise<CheckRunInfo[]> {
  try {
    const statuses = await octokit.paginate(octokit.repos.listCommitStatusesForRef, {
      owner,
      repo,
      ref: headSha,
      per_page: 100
    });

    return statuses.map((status) => ({
      name: status.context,
      status: "completed",
      conclusion: status.state
    }));
  } catch {
    return [];
  }
}

async function fetchRepoFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  ref: string
): Promise<PullRequestContext["repoFiles"]> {
  const [readme, contributing, pullRequestTemplate, codeowners, bitspamConfig] =
    await Promise.all([
      fetchFirstTextFile(octokit, owner, repo, ref, ["README.md", "readme.md"]),
      fetchFirstTextFile(octokit, owner, repo, ref, [
        "CONTRIBUTING.md",
        ".github/CONTRIBUTING.md",
        "docs/CONTRIBUTING.md"
      ]),
      fetchFirstTextFile(octokit, owner, repo, ref, [
        ".github/pull_request_template.md",
        "PULL_REQUEST_TEMPLATE.md",
        "docs/pull_request_template.md"
      ]),
      fetchFirstTextFile(octokit, owner, repo, ref, [
        "CODEOWNERS",
        ".github/CODEOWNERS",
        "docs/CODEOWNERS"
      ]),
      fetchFirstTextFile(octokit, owner, repo, ref, [
        ".bitspam.yml",
        ".bitspam.yaml"
      ])
    ]);

  const repoFiles: PullRequestContext["repoFiles"] = {};
  if (readme) repoFiles.readme = readme;
  if (contributing) repoFiles.contributing = contributing;
  if (pullRequestTemplate) repoFiles.pullRequestTemplate = pullRequestTemplate;
  if (codeowners) repoFiles.codeowners = codeowners;
  if (bitspamConfig) repoFiles.bitspamConfig = bitspamConfig;

  return repoFiles;
}

async function fetchFirstTextFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  ref: string,
  paths: string[]
): Promise<string | undefined> {
  for (const path of paths) {
    const content = await fetchTextFile(octokit, owner, repo, ref, path);
    if (content) {
      return content;
    }
  }

  return undefined;
}

async function fetchTextFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  ref: string,
  path: string
): Promise<string | undefined> {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref
    });

    if (Array.isArray(data) || data.type !== "file") {
      return undefined;
    }

    if ("content" in data && data.content) {
      return Buffer.from(data.content, "base64").toString("utf8");
    }

    return undefined;
  } catch {
    return undefined;
  }
}

async function fetchLinkedIssues(
  octokit: Octokit,
  owner: string,
  repo: string,
  body: string
): Promise<LinkedIssue[]> {
  const issueNumbers = extractIssueNumbers(body).slice(0, 5);
  const issues = await Promise.all(
    issueNumbers.map(async (issueNumber) => {
      try {
        const { data } = await octokit.issues.get({
          owner,
          repo,
          issue_number: issueNumber
        });

        return {
          number: data.number,
          title: data.title,
          state: data.state
        };
      } catch {
        return {
          number: issueNumber,
          title: "Referenced issue",
          state: "unknown"
        };
      }
    })
  );

  return issues;
}

function extractIssueNumbers(body: string): number[] {
  const matches = body.matchAll(/(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?|refs?|see)?\s*(?:#|issues\/)(\d+)/gi);
  const numbers = new Set<number>();

  for (const match of matches) {
    const issueNumber = Number(match[1]);
    if (Number.isInteger(issueNumber) && issueNumber > 0) {
      numbers.add(issueNumber);
    }
  }

  return [...numbers];
}

async function fetchContributorStats(
  octokit: Octokit,
  owner: string,
  repo: string,
  authorLogin: string
): Promise<ContributorStats> {
  if (!authorLogin) {
    return emptyContributorStats;
  }

  try {
    const [merged, open, closedUnmerged] = await Promise.all([
      countPrSearch(octokit, `repo:${owner}/${repo} type:pr author:${authorLogin} is:merged`),
      countPrSearch(octokit, `repo:${owner}/${repo} type:pr author:${authorLogin} is:open`),
      countPrSearch(octokit, `repo:${owner}/${repo} type:pr author:${authorLogin} is:closed -is:merged`)
    ]);

    return {
      isFirstTimeContributor: merged === 0,
      priorMergedPrs: merged,
      priorOpenPrs: open,
      priorClosedUnmergedPrs: closedUnmerged
    };
  } catch {
    return emptyContributorStats;
  }
}

async function countPrSearch(octokit: Octokit, q: string): Promise<number> {
  const { data } = await octokit.search.issuesAndPullRequests({
    q,
    per_page: 1
  });

  return data.total_count;
}

const emptyContributorStats: ContributorStats = {
  isFirstTimeContributor: true,
  priorMergedPrs: 0,
  priorOpenPrs: 0,
  priorClosedUnmergedPrs: 0
};

const defaultRepoPolicy: RepoPolicy = {
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
    "security/**",
    "auth/**",
    "crypto/**",
    "package.json",
    "pnpm-lock.yaml"
  ],
  lowRiskPaths: ["docs/**", "README.md", "examples/**"],
  requireIssueLink: true,
  requireTestEvidence: true,
  postSummaryComment: true,
  addLabels: true,
  createCheckRun: true,
  autoClose: false,
  proofOfWorkQuestions: [
    "Which issue or problem does this PR solve?",
    "What exact command did you run to test this change?",
    "Why did these specific files need to change?",
    "What should the maintainer focus on during review?"
  ]
};
