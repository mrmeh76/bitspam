import type { AISemanticResult, PullRequestContext } from "@bitspam/shared";

export type AIProvider = {
  name: AISemanticResult["provider"];
  analyzeSemanticRisk: (context: PullRequestContext) => Promise<AISemanticResult>;
};
