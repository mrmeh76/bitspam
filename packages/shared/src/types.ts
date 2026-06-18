export type Verdict =
  | "review_ready"
  | "needs_small_fixes"
  | "needs_proof_of_work"
  | "likely_low_quality"
  | "high_risk";

export type FindingSeverity = "info" | "low" | "medium" | "high" | "critical";

export type FindingCategory =
  | "intent"
  | "scope"
  | "tests"
  | "policy"
  | "risk"
  | "contributor"
  | "spam"
  | "ci"
  | "maintainer_burden";

export type Finding = {
  id: string;
  checkId: string;
  title: string;
  severity: FindingSeverity;
  category: FindingCategory;
  message: string;
  evidence: string[];
  recommendation: string;
  scoreImpact: number;
};

export type ChangedFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
};

export type CheckRunInfo = {
  name: string;
  status: string;
  conclusion?: string | null;
};

export type CommitInfo = {
  sha: string;
  message: string;
  author?: string;
};

export type CommentInfo = {
  author: string;
  body: string;
  createdAt: string;
};

export type LinkedIssue = {
  number: number;
  title: string;
  state: string;
};

export type ContributorStats = {
  isFirstTimeContributor: boolean;
  priorMergedPrs: number;
  priorOpenPrs: number;
  priorClosedUnmergedPrs: number;
};

export type RepoPolicy = {
  mode: "advisory" | "strict";
  thresholds: {
    reviewReady: number;
    needsEvidence: number;
    possibleSpam: number;
  };
  protectedPaths: string[];
  lowRiskPaths: string[];
  requireIssueLink: boolean;
  requireTestEvidence: boolean;
  postSummaryComment: boolean;
  addLabels: boolean;
  createCheckRun: boolean;
  autoClose: boolean;
  proofOfWorkQuestions: string[];
};

export type PullRequestContext = {
  owner: string;
  repo: string;
  number: number;
  title: string;
  body: string;
  authorLogin: string;
  authorAssociation?: string;
  createdAt?: string;
  updatedAt?: string;
  headSha: string;
  baseSha: string;
  changedFiles: ChangedFile[];
  commits: CommitInfo[];
  comments: CommentInfo[];
  linkedIssues: LinkedIssue[];
  checkRuns: CheckRunInfo[];
  repoFiles: {
    readme?: string;
    contributing?: string;
    pullRequestTemplate?: string;
    codeowners?: string;
    bitspamConfig?: string;
  };
  contributorStats: ContributorStats;
  policy: RepoPolicy;
};

export type ScoreBreakdown = Record<FindingCategory, number>;

export type AnalysisResult = {
  score: number;
  verdict: Verdict;
  summary: string;
  findings: Finding[];
  scoreBreakdown: ScoreBreakdown;
  suggestedContributorComment: string;
  maintainerRecommendation: string;
};

export type AnalyzerCheck = {
  id: string;
  run: (context: PullRequestContext) => Promise<Finding[]>;
};
