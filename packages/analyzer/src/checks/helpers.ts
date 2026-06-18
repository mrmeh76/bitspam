import type {
  Finding,
  FindingCategory,
  FindingSeverity,
  PullRequestContext
} from "@bitspam/shared";

export function createFinding(input: {
  checkId: string;
  title: string;
  severity: FindingSeverity;
  category: FindingCategory;
  message: string;
  evidence: string[];
  recommendation: string;
  scoreImpact: number;
}): Finding {
  return {
    id: `${input.checkId}:${slugify(input.title)}`,
    ...input
  };
}

export function totalChangedLines(context: PullRequestContext): number {
  return context.changedFiles.reduce((total, file) => total + file.changes, 0);
}

export function touchedDirectories(context: PullRequestContext): string[] {
  const dirs = context.changedFiles.map((file) => {
    const parts = file.filename.split("/");

    return parts.length > 1 ? parts[0] ?? "." : ".";
  });

  return [...new Set(dirs)].sort();
}

export function hasTestLikeFile(context: PullRequestContext): boolean {
  return context.changedFiles.some((file) =>
    /(^|\/)(__tests__|test|tests|spec|specs)(\/|$)|(\.|-)(test|spec)\.[cm]?[jt]sx?$/i.test(
      file.filename
    )
  );
}

export function mentionsTests(text: string): boolean {
  return /\b(tested|tests?|pnpm test|npm test|yarn test|cargo test|go test|pytest|vitest|jest|rspec|ci)\b/i.test(
    text
  );
}

export function normalizeText(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join("\n\n").trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
