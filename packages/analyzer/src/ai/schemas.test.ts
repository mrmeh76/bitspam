import { describe, expect, it } from "vitest";

import { parseAIResultJson } from "./schemas.js";

describe("parseAIResultJson", () => {
  it("validates structured JSON and pins the trusted provider name", () => {
    const result = parseAIResultJson(
      JSON.stringify({
        provider: "openai",
        bodyMatchesDiff: true,
        genericDescriptionRisk: "low",
        suspiciousClaims: [],
        suggestedProofQuestions: ["What command verified the change?"],
        maintainerSummary: "The description and diff appear aligned.",
        confidence: 0.72
      }),
      "test"
    );

    expect(result.provider).toBe("test");
    expect(result.bodyMatchesDiff).toBe(true);
    expect(result.confidence).toBe(0.72);
  });

  it("rejects malformed AI output", () => {
    expect(() =>
      parseAIResultJson(
        JSON.stringify({
          bodyMatchesDiff: "yes",
          genericDescriptionRisk: "certain",
          suspiciousClaims: [],
          suggestedProofQuestions: [],
          maintainerSummary: "",
          confidence: 2
        }),
        "gemini"
      )
    ).toThrow();
  });

  it("extracts a JSON object from provider wrappers", () => {
    const result = parseAIResultJson(
      [
        "```json",
        JSON.stringify({
          bodyMatchesDiff: false,
          genericDescriptionRisk: "medium",
          suspiciousClaims: ["Claims tests without evidence."],
          suggestedProofQuestions: ["Which exact test command did you run?"],
          maintainerSummary: "The PR needs clearer validation evidence.",
          confidence: 0.65
        }),
        "```"
      ].join("\n"),
      "openai"
    );

    expect(result.provider).toBe("openai");
    expect(result.genericDescriptionRisk).toBe("medium");
  });
});
