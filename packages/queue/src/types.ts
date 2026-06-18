export type AnalyzePrJobData = {
  owner: string;
  repo: string;
  number: number;
  installationId?: string;
  repositoryId?: string;
  pullRequestId?: string;
  headSha?: string;
};
