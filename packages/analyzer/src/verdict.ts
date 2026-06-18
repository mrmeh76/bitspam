import type { RepoPolicy, Verdict } from "@bitspam/shared";

export function getVerdict(score: number, policy?: RepoPolicy): Verdict {
  const reviewReady = policy?.thresholds.reviewReady ?? 80;
  const needsEvidence = policy?.thresholds.needsEvidence ?? 60;
  const possibleSpam = policy?.thresholds.possibleSpam ?? 40;

  if (score >= reviewReady) {
    return "review_ready";
  }

  if (score >= needsEvidence) {
    return "needs_small_fixes";
  }

  if (score >= possibleSpam) {
    return "needs_proof_of_work";
  }

  if (score >= 20) {
    return "likely_low_quality";
  }

  return "high_risk";
}
