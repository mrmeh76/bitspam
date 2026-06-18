export type AnalyzePrJobData = {
  analysisRunId: string;
  url: string;
  owner: string;
  repo: string;
  number: number;
  installationId?: string;
  repositoryId?: string;
  pullRequestId?: string;
  headSha?: string;
  checkRunId?: string;
};

export type AnalyzePrJobResult = {
  analysisRunId: string;
  status: "completed" | "failed";
};
