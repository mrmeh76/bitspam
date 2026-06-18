import type { AnalyzerCheck } from "@bitspam/shared";

import { ciStatusCheck } from "./checks/ci-status.js";
import { diffScopeCheck } from "./checks/diff-scope.js";
import { intentQualityCheck } from "./checks/intent-quality.js";
import { issueLinkCheck } from "./checks/issue-link.js";
import { maintainerBurdenCheck } from "./checks/maintainer-burden.js";
import { riskyPathsCheck } from "./checks/risky-paths.js";
import { spamPatternsCheck } from "./checks/spam-patterns.js";
import { testEvidenceCheck } from "./checks/test-evidence.js";

export const analyzerChecks: AnalyzerCheck[] = [
  intentQualityCheck,
  issueLinkCheck,
  diffScopeCheck,
  testEvidenceCheck,
  riskyPathsCheck,
  ciStatusCheck,
  spamPatternsCheck,
  maintainerBurdenCheck
];
