import { GoogleGenAI } from "@google/genai";
import { safeParseJson } from "@/lib/ai/json";

let geminiClient: GoogleGenAI | null = null;

function resolvePrimaryModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3-flash";
}

function resolveFallbackModel(primaryModel: string): string | null {
  const configuredFallback = process.env.GEMINI_FALLBACK_MODEL?.trim();
  if (configuredFallback) {
    return configuredFallback === primaryModel ? null : configuredFallback;
  }

  const defaultFallback = "gemini-2.5-flash";
  return defaultFallback === primaryModel ? null : defaultFallback;
}

function isModelNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeStatus = (error as { status?: unknown }).status;
  if (typeof maybeStatus === "number" && maybeStatus === 404) {
    return true;
  }

  const message =
    error instanceof Error ? error.message : String(error);

  return (
    message.includes("is not found for API version") ||
    message.includes("\"status\":\"NOT_FOUND\"")
  );
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }

  return geminiClient;
}

function buildGenerationConfig(input: {
  model: string;
  maxOutputTokens: number;
  responseJsonSchema?: unknown;
}) {
  const baseConfig: Record<string, unknown> = {
    temperature: 1.0,
    maxOutputTokens: input.maxOutputTokens,
    responseMimeType: "application/json",
  };

  if (input.responseJsonSchema) {
    baseConfig.responseJsonSchema = input.responseJsonSchema;
  }

  if (input.model.includes("2.5")) {
    baseConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  return baseConfig;
}

function isInvalidJsonError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes("is not valid JSON");
}

function parseGeminiJson(text: string): unknown {
  return safeParseJson(text, "Gemini response");
}

export async function generateJson(params: {
  prompt: string;
  maxOutputTokens: number;
  responseJsonSchema?: unknown;
  invalidJsonRetries?: number;
}): Promise<unknown> {
  const ai = getGeminiClient();
  const primaryModel = resolvePrimaryModel();
  const fallbackModel = resolveFallbackModel(primaryModel);
  const invalidJsonRetries = params.invalidJsonRetries ?? 1;
  const firstAttemptTokens = params.maxOutputTokens;
  const retryAttemptTokens = Math.min(2400, Math.max(params.maxOutputTokens + 400, params.maxOutputTokens * 2));

  const generateWithModel = async (model: string, maxOutputTokens: number) =>
    ai.models.generateContent({
      model,
      contents: params.prompt,
      config: buildGenerationConfig({
        model,
        maxOutputTokens,
        responseJsonSchema: params.responseJsonSchema,
      }),
    });

  const attemptGenerateAndParse = async (model: string, maxOutputTokens: number) => {
    const response = await generateWithModel(model, maxOutputTokens);
    const text = response.text?.trim();
    if (!text) {
      throw new Error("Gemini returned an empty response body.");
    }

    return parseGeminiJson(text);
  };

  let selectedModel = primaryModel;
  try {
    selectedModel = primaryModel;
    return await attemptGenerateAndParse(primaryModel, firstAttemptTokens);
  } catch (error) {
    if (!fallbackModel || !isModelNotFoundError(error)) {
      if (!isInvalidJsonError(error) || invalidJsonRetries <= 0) {
        throw error;
      }

      console.warn(
        JSON.stringify({
          level: "warn",
          endpoint: "gemini",
          message: `Invalid JSON from '${selectedModel}', retrying once with higher token budget.`,
        }),
      );
      return attemptGenerateAndParse(selectedModel, retryAttemptTokens);
    }

    console.warn(
      JSON.stringify({
        level: "warn",
        endpoint: "gemini",
        message: `Primary model '${primaryModel}' unavailable, retrying with '${fallbackModel}'.`,
      }),
    );
    selectedModel = fallbackModel;
  }

  try {
    return await attemptGenerateAndParse(selectedModel, firstAttemptTokens);
  } catch (error) {
    if (!isInvalidJsonError(error) || invalidJsonRetries <= 0) {
      throw error;
    }

    console.warn(
      JSON.stringify({
        level: "warn",
        endpoint: "gemini",
        message: `Invalid JSON from '${selectedModel}', retrying once with higher token budget.`,
      }),
    );
    return attemptGenerateAndParse(selectedModel, retryAttemptTokens);
  }
}
