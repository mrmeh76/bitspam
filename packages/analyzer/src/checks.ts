import type { AnalyzerCheck } from "@bitspam/shared";

import { ciStatusCheck } from "./checks/ci-status.js";
import { contributingRulesCheck } from "./checks/contributing-rules.js";
import { contributorHistoryCheck } from "./checks/contributor-history.js";
import { diffScopeCheck } from "./checks/diff-scope.js";
import { intentQualityCheck } from "./checks/intent-quality.js";
import { issueLinkCheck } from "./checks/issue-link.js";
import { maintainerBurdenCheck } from "./checks/maintainer-burden.js";
import { prTemplateCheck } from "./checks/pr-template.js";
import { riskyPathsCheck } from "./checks/risky-paths.js";
import { spamPatternsCheck } from "./checks/spam-patterns.js";
import { testEvidenceCheck } from "./checks/test-evidence.js";

export const analyzerChecks: AnalyzerCheck[] = [
  intentQualityCheck,
  issueLinkCheck,
  prTemplateCheck,
  contributingRulesCheck,
  diffScopeCheck,
  testEvidenceCheck,
  riskyPathsCheck,
  ciStatusCheck,
  contributorHistoryCheck,
  spamPatternsCheck,
  maintainerBurdenCheck
];
