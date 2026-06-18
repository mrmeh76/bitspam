import { parse } from "yaml";

import type { PullRequestContext, RepoPolicy } from "@bitspam/shared";

type BitspamConfig = {
  mode?: "advisory" | "strict";
  preset?: string;
  thresholds?: {
    review_ready?: number;
    needs_evidence?: number;
    possible_spam?: number;
  };
  checks?: {
    require_issue_link?: boolean;
    require_test_evidence?: boolean;
  };
  protected_paths?: string[];
  low_risk_paths?: string[];
  proof_of_work?: {
    questions?: string[];
  };
  automation?: {
    post_summary_comment?: boolean;
    add_labels?: boolean;
    create_check_run?: boolean;
    auto_close?: boolean;
  };
};

export const bitcoinOpenSourcePreset: Pick<
  RepoPolicy,
  "protectedPaths" | "lowRiskPaths" | "proofOfWorkQuestions"
> = {
  protectedPaths: [
    ".github/workflows/**",
    "src/consensus/**",
    "src/wallet/**",
    "security/**",
    "auth/**",
    "crypto/**",
    "package.json",
    "pnpm-lock.yaml",
    "Cargo.toml",
    "Cargo.lock"
  ],
  lowRiskPaths: ["docs/**", "README.md", "examples/**"],
  proofOfWorkQuestions: [
    "Which issue or problem does this PR solve?",
    "What exact command did you run to test this change?",
    "Why did these specific files need to change?",
    "What should the maintainer focus on during review?"
  ]
};

export const defaultRepoPolicy: RepoPolicy = {
  mode: "advisory",
  thresholds: {
    reviewReady: 80,
    needsEvidence: 60,
    possibleSpam: 40
  },
  protectedPaths: bitcoinOpenSourcePreset.protectedPaths,
  lowRiskPaths: bitcoinOpenSourcePreset.lowRiskPaths,
  requireIssueLink: true,
  requireTestEvidence: true,
  postSummaryComment: true,
  addLabels: true,
  createCheckRun: true,
  autoClose: false,
  proofOfWorkQuestions: bitcoinOpenSourcePreset.proofOfWorkQuestions
};

export function applyRepoPolicyConfig(context: PullRequestContext): PullRequestContext {
  const parsedPolicy = parseRepoPolicyConfig(context.repoFiles.bitspamConfig);

  return {
    ...context,
    policy: mergeRepoPolicy(context.policy ?? defaultRepoPolicy, parsedPolicy)
  };
}

export function parseRepoPolicyConfig(configText?: string): Partial<RepoPolicy> {
  if (!configText?.trim()) {
    return {};
  }

  try {
    const config = parse(configText) as BitspamConfig | null;
    if (!config || typeof config !== "object") {
      return {};
    }

    const preset =
      config.preset === "bitcoin-open-source" ? bitcoinOpenSourcePreset : undefined;

    return {
      ...(config.mode ? { mode: config.mode } : {}),
      ...(config.thresholds
        ? {
            thresholds: {
              reviewReady:
                config.thresholds.review_ready ?? defaultRepoPolicy.thresholds.reviewReady,
              needsEvidence:
                config.thresholds.needs_evidence ??
                defaultRepoPolicy.thresholds.needsEvidence,
              possibleSpam:
                config.thresholds.possible_spam ??
                defaultRepoPolicy.thresholds.possibleSpam
            }
          }
        : {}),
      ...(config.checks?.require_issue_link !== undefined
        ? { requireIssueLink: config.checks.require_issue_link }
        : {}),
      ...(config.checks?.require_test_evidence !== undefined
        ? { requireTestEvidence: config.checks.require_test_evidence }
        : {}),
      ...(preset ? { protectedPaths: preset.protectedPaths } : {}),
      ...(preset ? { lowRiskPaths: preset.lowRiskPaths } : {}),
      ...(preset ? { proofOfWorkQuestions: preset.proofOfWorkQuestions } : {}),
      ...(config.protected_paths ? { protectedPaths: config.protected_paths } : {}),
      ...(config.low_risk_paths ? { lowRiskPaths: config.low_risk_paths } : {}),
      ...(config.proof_of_work?.questions
        ? { proofOfWorkQuestions: config.proof_of_work.questions }
        : {}),
      ...(config.automation?.post_summary_comment !== undefined
        ? { postSummaryComment: config.automation.post_summary_comment }
        : {}),
      ...(config.automation?.add_labels !== undefined
        ? { addLabels: config.automation.add_labels }
        : {}),
      ...(config.automation?.create_check_run !== undefined
        ? { createCheckRun: config.automation.create_check_run }
        : {}),
      ...(config.automation?.auto_close !== undefined
        ? { autoClose: config.automation.auto_close }
        : {})
    };
  } catch {
    return {};
  }
}

function mergeRepoPolicy(base: RepoPolicy, override: Partial<RepoPolicy>): RepoPolicy {
  return {
    ...defaultRepoPolicy,
    ...base,
    ...override,
    thresholds: {
      ...defaultRepoPolicy.thresholds,
      ...base.thresholds,
      ...override.thresholds
    }
  };
}
