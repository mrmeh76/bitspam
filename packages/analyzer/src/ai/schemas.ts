import { z } from "zod";

export const aiProviderNameSchema = z.enum(["gemini", "openai", "test"]);

export const aiSemanticResultSchema = z.object({
  provider: aiProviderNameSchema,
  bodyMatchesDiff: z.boolean(),
  genericDescriptionRisk: z.enum(["low", "medium", "high"]),
  suspiciousClaims: z.array(z.string().min(1).max(240)).max(6),
  suggestedProofQuestions: z.array(z.string().min(1).max(220)).max(5),
  maintainerSummary: z.string().min(1).max(600),
  confidence: z.number().min(0).max(1)
});

export type ValidatedAIResult = z.infer<typeof aiSemanticResultSchema>;

export function parseAIResultJson(jsonText: string, provider: "gemini" | "openai" | "test") {
  const parsed = JSON.parse(extractJsonObject(jsonText)) as unknown;

  return aiSemanticResultSchema.parse({
    ...(typeof parsed === "object" && parsed !== null ? parsed : {}),
    provider
  });
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not contain a JSON object.");
  }

  return trimmed.slice(start, end + 1);
}
