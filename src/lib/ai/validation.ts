import type {
  MonthlyInsightModelResponse,
  WeeklyInsightModelResponse,
} from "@/lib/ai/geminiPromptTemplates";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function asNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string.`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} must be non-empty.`);
  }

  return trimmed;
}

function validateSuggestions(value: unknown): [string, string, string] {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new Error("suggestions must be an array of exactly 3 strings.");
  }

  const normalized = value.map((item, index) =>
    asNonEmptyString(item, `suggestions[${index}]`),
  );

  return [normalized[0], normalized[1], normalized[2]];
}

export function validateWeeklyInsightModelResponse(
  raw: unknown,
): WeeklyInsightModelResponse {
  if (!isRecord(raw)) {
    throw new Error("Gemini response must be a JSON object.");
  }

  return {
    summary: asNonEmptyString(raw.summary, "summary"),
    suggestions: validateSuggestions(raw.suggestions),
    trend_highlight: asNonEmptyString(raw.trend_highlight, "trend_highlight"),
  };
}

export function validateMonthlyInsightModelResponse(
  raw: unknown,
  hasGoal: boolean,
): MonthlyInsightModelResponse {
  const weeklyShape = validateWeeklyInsightModelResponse(raw);
  const record = raw as Record<string, unknown>;

  const commentary = record.savings_commentary;
  if (hasGoal) {
    return {
      ...weeklyShape,
      savings_commentary: asNonEmptyString(
        commentary,
        "savings_commentary",
      ),
    };
  }

  if (commentary !== null) {
    throw new Error(
      "savings_commentary must be null when no savings goal exists.",
    );
  }

  return {
    ...weeklyShape,
    savings_commentary: null,
  };
}

