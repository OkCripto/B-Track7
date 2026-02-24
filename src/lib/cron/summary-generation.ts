import type { SupabaseClient } from "@supabase/supabase-js";
import {
  aggregateMonthlyTransactions,
  aggregateWeeklyTransactions,
} from "@/lib/cron/aggregations";
import { fetchUserTransactionsForRange } from "@/lib/cron/transactions";
import type { UserTransaction } from "@/lib/cron/transactions";
import { buildMonthlyGeminiPrompt, buildWeeklyGeminiPrompt } from "@/lib/ai/geminiPromptTemplates";
import { generateJson } from "@/lib/ai/gemini";
import {
  validateMonthlyInsightModelResponse,
  validateWeeklyInsightModelResponse,
} from "@/lib/ai/validation";
import { upsertAiSummary } from "@/lib/cron/summary-upsert";
import { resolveCurrentMonthSavingsGoal } from "@/lib/cron/savings-goals";
import { getCurrentIstDateKey } from "@/lib/cron/time";
import type { CronStage } from "@/lib/cron/logging";
import type { MonthlyPeriods, WeeklyPeriods } from "@/lib/cron/time";

const DEFAULT_BOOTSTRAP_WEEKLY_LOOKBACK = 16;
const DEFAULT_BOOTSTRAP_MONTHLY_LOOKBACK = 12;

type PeriodType = "weekly" | "monthly";
type SkipReason = "no_transactions";

const WEEKLY_RESPONSE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "suggestions", "trend_highlight"],
  properties: {
    summary: { type: "string" },
    suggestions: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string" },
    },
    trend_highlight: { type: "string" },
  },
} as const;

const MONTHLY_RESPONSE_JSON_SCHEMA_WITH_GOAL = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "suggestions", "trend_highlight", "savings_commentary"],
  properties: {
    summary: { type: "string" },
    suggestions: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string" },
    },
    trend_highlight: { type: "string" },
    savings_commentary: { type: "string" },
  },
} as const;

const MONTHLY_RESPONSE_JSON_SCHEMA_NO_GOAL = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "suggestions", "trend_highlight", "savings_commentary"],
  properties: {
    summary: { type: "string" },
    suggestions: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string" },
    },
    trend_highlight: { type: "string" },
    savings_commentary: { type: "null" },
  },
} as const;

export type SummaryGenerationResult = {
  status: "processed" | "skipped";
  periodType: PeriodType;
  periodStart: string;
  periodEnd: string;
  reason?: SkipReason;
};

export class SummaryGenerationError extends Error {
  readonly stage: CronStage;

  constructor(params: { stage: CronStage; message: string; cause?: unknown }) {
    super(params.message, params.cause ? { cause: params.cause } : undefined);
    this.name = "SummaryGenerationError";
    this.stage = params.stage;
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

type WeeklyGenerationInput = {
  admin: SupabaseClient;
  userId: string;
  periods: WeeklyPeriods;
  transactions?: UserTransaction[];
};

type MonthlyGenerationInput = {
  admin: SupabaseClient;
  userId: string;
  periods: MonthlyPeriods;
  includeSavingsGoal: boolean;
  transactions?: UserTransaction[];
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function parseDateKey(dateKey: string) {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split("-");
  return {
    year: Number(yearRaw),
    month: Number(monthRaw),
    day: Number(dayRaw),
  };
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function addDays(dateKey: string, days: number): string {
  const parsed = parseDateKey(dateKey);
  const utcDate = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);

  return toDateKey(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth() + 1,
    utcDate.getUTCDate(),
  );
}

function shiftMonth(year: number, month: number, delta: number) {
  const absoluteMonth = year * 12 + (month - 1) + delta;
  return {
    year: Math.floor(absoluteMonth / 12),
    month: (absoluteMonth % 12) + 1,
  };
}

function shiftMonthStart(monthStart: string, delta: number): string {
  const parsed = parseDateKey(monthStart);
  const shifted = shiftMonth(parsed.year, parsed.month, delta);
  return toDateKey(shifted.year, shifted.month, 1);
}

function lastDayOfMonth(monthStart: string): string {
  const parsed = parseDateKey(monthStart);
  const day = new Date(Date.UTC(parsed.year, parsed.month, 0)).getUTCDate();
  return toDateKey(parsed.year, parsed.month, day);
}

function monthLabel(monthStart: string): string {
  const parsed = parseDateKey(monthStart);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(parsed.year, parsed.month - 1, 1)));
}

function getCurrentMonthStart(todayDateKey: string): string {
  const parsed = parseDateKey(todayDateKey);
  return toDateKey(parsed.year, parsed.month, 1);
}

function buildWeeklyPeriodsEndingAt(endDateKey: string): WeeklyPeriods {
  return {
    today: endDateKey,
    week1: { start: addDays(endDateKey, -6), end: endDateKey },
    week2: { start: addDays(endDateKey, -13), end: addDays(endDateKey, -7) },
    week3: { start: addDays(endDateKey, -20), end: addDays(endDateKey, -14) },
    week4: { start: addDays(endDateKey, -27), end: addDays(endDateKey, -21) },
  };
}

function buildMonthlyPeriodsForAnchor(
  anchorMonthStart: string,
  anchorMonthEnd: string,
): MonthlyPeriods {
  const anchor = parseDateKey(anchorMonthStart);
  const minus1 = shiftMonth(anchor.year, anchor.month, -1);
  const minus2 = shiftMonth(anchor.year, anchor.month, -2);
  const minus3 = shiftMonth(anchor.year, anchor.month, -3);

  const minus1Start = toDateKey(minus1.year, minus1.month, 1);
  const minus2Start = toDateKey(minus2.year, minus2.month, 1);
  const minus3Start = toDateKey(minus3.year, minus3.month, 1);

  return {
    today: anchorMonthEnd,
    currentMonthStart: anchorMonthStart,
    previousMonthStart: minus1Start,
    current: {
      label: monthLabel(anchorMonthStart),
      start: anchorMonthStart,
      end: anchorMonthEnd,
    },
    minus1: {
      label: monthLabel(minus1Start),
      start: minus1Start,
      end: lastDayOfMonth(minus1Start),
    },
    minus2: {
      label: monthLabel(minus2Start),
      start: minus2Start,
      end: lastDayOfMonth(minus2Start),
    },
    minus3: {
      label: monthLabel(minus3Start),
      start: minus3Start,
      end: lastDayOfMonth(minus3Start),
    },
  };
}

async function generateWeeklyWithTransactions(input: {
  admin: SupabaseClient;
  userId: string;
  periods: WeeklyPeriods;
  transactions: UserTransaction[];
}): Promise<SummaryGenerationResult> {
  let stage: CronStage = "aggregate";

  try {
    stage = "aggregate";
    const weeklyAggregation = aggregateWeeklyTransactions(
      input.transactions,
      input.periods,
    );

    if (weeklyAggregation.week1TransactionCount === 0) {
      return {
        status: "skipped",
        reason: "no_transactions",
        periodType: "weekly",
        periodStart: input.periods.week1.start,
        periodEnd: input.periods.week1.end,
      };
    }

    stage = "prompt";
    const prompt = buildWeeklyGeminiPrompt(weeklyAggregation.promptInput);

    stage = "gemini";
    const rawModelResponse = await generateJson({
      prompt,
      maxOutputTokens: 1000,
      responseJsonSchema: WEEKLY_RESPONSE_JSON_SCHEMA,
      invalidJsonRetries: 1,
    });

    stage = "validate";
    const modelResponse =
      validateWeeklyInsightModelResponse(rawModelResponse);

    stage = "save";
    await upsertAiSummary(input.admin, {
      userId: input.userId,
      periodType: "weekly",
      periodStart: input.periods.week1.start,
      periodEnd: input.periods.week1.end,
      summary: modelResponse.summary,
      suggestions: modelResponse.suggestions,
      trendHighlight: modelResponse.trend_highlight,
      savingsCommentary: null,
    });

    return {
      status: "processed",
      periodType: "weekly",
      periodStart: input.periods.week1.start,
      periodEnd: input.periods.week1.end,
    };
  } catch (error) {
    throw new SummaryGenerationError({
      stage,
      message: `Failed weekly summary generation for user ${input.userId}: ${getErrorMessage(error)}`,
      cause: error,
    });
  }
}

async function generateMonthlyWithTransactions(input: {
  admin: SupabaseClient;
  userId: string;
  periods: MonthlyPeriods;
  includeSavingsGoal: boolean;
  transactions: UserTransaction[];
}): Promise<SummaryGenerationResult> {
  let stage: CronStage = "aggregate";

  try {
    stage = "aggregate";
    const monthlyAggregation = aggregateMonthlyTransactions(
      input.transactions,
      input.periods,
    );

    if (monthlyAggregation.currentMonthTransactionCount === 0) {
      return {
        status: "skipped",
        reason: "no_transactions",
        periodType: "monthly",
        periodStart: input.periods.current.start,
        periodEnd: input.periods.current.end,
      };
    }

    stage = "fetch";
    const savingsGoal = input.includeSavingsGoal
      ? await resolveCurrentMonthSavingsGoal({
          admin: input.admin,
          userId: input.userId,
          currentMonthStart: input.periods.currentMonthStart,
          previousMonthStart: input.periods.previousMonthStart,
          actualSavings: monthlyAggregation.promptInput.currentMonth.netSavings,
        })
      : {
          hasGoal: false,
          goalAmount: null,
          promptGoalData: null,
        };

    stage = "prompt";
    const prompt = buildMonthlyGeminiPrompt({
      ...monthlyAggregation.promptInput,
      savingsGoal: savingsGoal.promptGoalData,
    });

    stage = "gemini";
    const rawModelResponse = await generateJson({
      prompt,
      maxOutputTokens: 1200,
      responseJsonSchema: savingsGoal.hasGoal
        ? MONTHLY_RESPONSE_JSON_SCHEMA_WITH_GOAL
        : MONTHLY_RESPONSE_JSON_SCHEMA_NO_GOAL,
      invalidJsonRetries: 1,
    });

    stage = "validate";
    const modelResponse = validateMonthlyInsightModelResponse(
      rawModelResponse,
      savingsGoal.hasGoal,
    );

    stage = "save";
    await upsertAiSummary(input.admin, {
      userId: input.userId,
      periodType: "monthly",
      periodStart: input.periods.current.start,
      periodEnd: input.periods.current.end,
      summary: modelResponse.summary,
      suggestions: modelResponse.suggestions,
      trendHighlight: modelResponse.trend_highlight,
      savingsCommentary: modelResponse.savings_commentary,
    });

    return {
      status: "processed",
      periodType: "monthly",
      periodStart: input.periods.current.start,
      periodEnd: input.periods.current.end,
    };
  } catch (error) {
    throw new SummaryGenerationError({
      stage,
      message: `Failed monthly summary generation for user ${input.userId}: ${getErrorMessage(error)}`,
      cause: error,
    });
  }
}

export async function processWeeklySummaryForUser(
  input: WeeklyGenerationInput,
): Promise<SummaryGenerationResult> {
  const transactions =
    input.transactions ??
    (await fetchUserTransactionsForRange(
      input.admin,
      input.userId,
      input.periods.week4.start,
      input.periods.week1.end,
    ));

  return generateWeeklyWithTransactions({
    admin: input.admin,
    userId: input.userId,
    periods: input.periods,
    transactions,
  });
}

export async function processMonthlySummaryForUser(
  input: MonthlyGenerationInput,
): Promise<SummaryGenerationResult> {
  const transactions =
    input.transactions ??
    (await fetchUserTransactionsForRange(
      input.admin,
      input.userId,
      input.periods.minus3.start,
      input.periods.current.end,
    ));

  return generateMonthlyWithTransactions({
    admin: input.admin,
    userId: input.userId,
    periods: input.periods,
    includeSavingsGoal: input.includeSavingsGoal,
    transactions,
  });
}

export async function bootstrapWeeklySummaryForUser(params: {
  admin: SupabaseClient;
  userId: string;
  lookbackWeeks?: number;
  todayDateKey?: string;
}): Promise<SummaryGenerationResult> {
  const lookbackWeeks = params.lookbackWeeks ?? DEFAULT_BOOTSTRAP_WEEKLY_LOOKBACK;
  const todayDateKey = params.todayDateKey ?? getCurrentIstDateKey();

  const oldestWeekEnd = addDays(todayDateKey, -7 * (lookbackWeeks - 1));
  const searchStart = addDays(oldestWeekEnd, -27);
  const transactions = await fetchUserTransactionsForRange(
    params.admin,
    params.userId,
    searchStart,
    todayDateKey,
  );

  if (transactions.length === 0) {
    return {
      status: "skipped",
      reason: "no_transactions",
      periodType: "weekly",
      periodStart: addDays(todayDateKey, -6),
      periodEnd: todayDateKey,
    };
  }

  for (let offset = 0; offset < lookbackWeeks; offset += 1) {
    const candidateEnd = addDays(todayDateKey, -7 * offset);
    const candidatePeriods = buildWeeklyPeriodsEndingAt(candidateEnd);
    const candidateAggregation = aggregateWeeklyTransactions(
      transactions,
      candidatePeriods,
    );

    if (candidateAggregation.week1TransactionCount === 0) {
      continue;
    }

    return processWeeklySummaryForUser({
      admin: params.admin,
      userId: params.userId,
      periods: candidatePeriods,
      transactions,
    });
  }

  return {
    status: "skipped",
    reason: "no_transactions",
    periodType: "weekly",
    periodStart: addDays(todayDateKey, -6),
    periodEnd: todayDateKey,
  };
}

export async function bootstrapMonthlySummaryForUser(params: {
  admin: SupabaseClient;
  userId: string;
  lookbackMonths?: number;
  todayDateKey?: string;
}): Promise<SummaryGenerationResult> {
  const lookbackMonths = params.lookbackMonths ?? DEFAULT_BOOTSTRAP_MONTHLY_LOOKBACK;
  const todayDateKey = params.todayDateKey ?? getCurrentIstDateKey();
  const currentMonthStart = getCurrentMonthStart(todayDateKey);
  const oldestAnchorMonthStart = shiftMonthStart(currentMonthStart, -(lookbackMonths - 1));
  const searchStart = shiftMonthStart(oldestAnchorMonthStart, -3);

  const transactions = await fetchUserTransactionsForRange(
    params.admin,
    params.userId,
    searchStart,
    todayDateKey,
  );

  if (transactions.length === 0) {
    return {
      status: "skipped",
      reason: "no_transactions",
      periodType: "monthly",
      periodStart: currentMonthStart,
      periodEnd: todayDateKey,
    };
  }

  for (let offset = 0; offset < lookbackMonths; offset += 1) {
    const anchorMonthStart = shiftMonthStart(currentMonthStart, -offset);
    const anchorMonthEnd =
      offset === 0 ? todayDateKey : lastDayOfMonth(anchorMonthStart);
    const candidatePeriods = buildMonthlyPeriodsForAnchor(
      anchorMonthStart,
      anchorMonthEnd,
    );
    const candidateAggregation = aggregateMonthlyTransactions(
      transactions,
      candidatePeriods,
    );

    if (candidateAggregation.currentMonthTransactionCount === 0) {
      continue;
    }

    return processMonthlySummaryForUser({
      admin: params.admin,
      userId: params.userId,
      periods: candidatePeriods,
      includeSavingsGoal: offset === 0,
      transactions,
    });
  }

  return {
    status: "skipped",
    reason: "no_transactions",
    periodType: "monthly",
    periodStart: currentMonthStart,
    periodEnd: todayDateKey,
  };
}
