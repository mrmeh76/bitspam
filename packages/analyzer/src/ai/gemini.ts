import { GoogleGenerativeAI } from "@google/generative-ai";

import type { PullRequestContext } from "@bitspam/shared";

import { buildSemanticRiskPrompt } from "./prompt.js";
import type { AIProvider } from "./provider.js";
import { parseAIResultJson } from "./schemas.js";

export type GeminiProviderOptions = {
  apiKey: string;
  model?: string;
};

export function createGeminiProvider({
  apiKey,
  model = "gemini-2.5-flash"
}: GeminiProviderOptions): AIProvider {
  const client = new GoogleGenerativeAI(apiKey);
  const generativeModel = client.getGenerativeModel({
    model,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2
    }
  });

  return {
    name: "gemini",
    async analyzeSemanticRisk(context: PullRequestContext) {
      const response = await generativeModel.generateContent(buildSemanticRiskPrompt(context));

      return parseAIResultJson(response.response.text(), "gemini");
    }
  };
}
