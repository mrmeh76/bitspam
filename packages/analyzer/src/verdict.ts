import type { Verdict } from "@bitspam/shared";

export function getVerdict(score: number): Verdict {
  if (score >= 80) {
    return "review_ready";
  }

  if (score >= 60) {
    return "needs_small_fixes";
  }

  if (score >= 40) {
    return "needs_proof_of_work";
  }

  if (score >= 20) {
    return "likely_low_quality";
  }

  return "high_risk";
}
