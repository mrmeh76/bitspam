import type { AIProvider } from "./provider.js";
import { createGeminiProvider } from "./gemini.js";
import { createOpenAIProvider } from "./openai.js";

export type AIProviderEnv = {
  AI_PROVIDER?: string | undefined;
  GEMINI_API_KEY?: string | undefined;
  GEMINI_MODEL?: string | undefined;
  OPENAI_API_KEY?: string | undefined;
  OPENAI_MODEL?: string | undefined;
};

export function createAIProviderFromEnv(env: AIProviderEnv): AIProvider | undefined {
  const provider = env.AI_PROVIDER?.toLowerCase() ?? "gemini";

  if (provider === "none" || provider === "off" || provider === "false") {
    return undefined;
  }

  if (provider === "openai") {
    return env.OPENAI_API_KEY
      ? createOpenAIProvider({
          apiKey: env.OPENAI_API_KEY,
          ...(env.OPENAI_MODEL ? { model: env.OPENAI_MODEL } : {})
        })
      : undefined;
  }

  return env.GEMINI_API_KEY
    ? createGeminiProvider({
        apiKey: env.GEMINI_API_KEY,
        ...(env.GEMINI_MODEL ? { model: env.GEMINI_MODEL } : {})
      })
    : undefined;
}
