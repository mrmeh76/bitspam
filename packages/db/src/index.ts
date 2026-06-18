export { createDbClient } from "./client.js";
export type { BitSpamDb } from "./client.js";
export {
  completeAnalysisRun,
  createQueuedAnalysisRun,
  failAnalysisRun,
  getAnalysisRunDetail,
  listRecentAnalysisRuns,
  markAnalysisRunProcessing,
  saveAnalysisRun
} from "./persistence.js";
export type {
  AnalysisHistoryItem,
  AnalysisRunDetail,
  CompleteAnalysisRunInput,
  CreateQueuedAnalysisRunInput,
  SaveAnalysisRunInput,
  SavedAnalysisRun
} from "./persistence.js";
export * from "./schema.js";
