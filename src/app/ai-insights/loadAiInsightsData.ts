import { redirect } from "next/navigation";
import type {
  AiInsightsClientProps,
  HealthStatus,
  InsightSummary,
  SavingsGoalRecord,
} from "./AiInsightsClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMonthlyPeriods } from "@/lib/cron/time";

type SummaryRow = {
  id: string;
  period_type: string;
  period_start: string;
  period_end: string;
  summary: string;
  suggestions: unknown;
  trend_highlight: string;
  savings_commentary: string | null;
  created_at: string;
  category_health?: unknown;
};

type GoalRow = {
  month: string;
  goal_amount: number | string;
  was_auto_filled: boolean;
};

function parseDateKey(dateKey: string) {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split("-");
  return {
    year: Number(yearRaw),
    month: Number(monthRaw),
    day: Number(dayRaw),
  };
}

function addDays(dateKey: string, delta: number): string {
  const parsed = parseDateKey(dateKey);
  const utc = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  utc.setUTCDate(utc.getUTCDate() + delta);
  return utc.toISOString().slice(0, 10);
}

function getNextMonthStart(dateKey: string): string {
  const parsed = parseDateKey(dateKey);
  const nextMonthDate = new Date(Date.UTC(parsed.year, parsed.month, 1));
  return nextMonthDate.toISOString().slice(0, 10);
}

function getLastDayOfMonth(dateKey: string): string {
  const parsed = parseDateKey(dateKey);
  const lastDay = new Date(Date.UTC(parsed.year, parsed.month, 0));
  return lastDay.toISOString().slice(0, 10);
}

function daysBetween(dateFrom: string, dateTo: string): number {
  const from = Date.parse(`${dateFrom}T00:00:00.000Z`);
  const to = Date.parse(`${dateTo}T00:00:00.000Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  const diff = Math.floor((to - from) / 86_400_000);
  return diff > 0 ? diff : 0;
}

function formatMonthLabel(dateKey: string): string {
  const parsed = parseDateKey(dateKey);
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, 1));
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function parseSuggestions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function parseCategoryHealth(value: unknown): Record<string, HealthStatus> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const allowed: HealthStatus[] = ["Good", "Warning", "Critical"];
  const parsed: Record<string, HealthStatus> = {};

  for (const [category, statusValue] of Object.entries(value)) {
    if (
      typeof category === "string" &&
      typeof statusValue === "string" &&
      allowed.includes(statusValue as HealthStatus)
    ) {
      parsed[category] = statusValue as HealthStatus;
    }
  }

  return Object.keys(parsed).length > 0 ? parsed : null;
}

function toInsightSummary(row: SummaryRow): InsightSummary | null {
  if (row.period_type !== "weekly" && row.period_type !== "monthly") return null;
  if (!row.id || !row.period_start || !row.period_end || !row.summary || !row.created_at) return null;

  return {
    id: row.id,
    periodType: row.period_type,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    summary: row.summary,
    suggestions: parseSuggestions(row.suggestions),
    trendHighlight: row.trend_highlight ?? "",
    savingsCommentary: row.savings_commentary ?? null,
    categoryHealth: parseCategoryHealth(row.category_health),
    createdAt: row.created_at,
  };
}

function parseGoalAmount(value: number | string): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeGoal(row: GoalRow): SavingsGoalRecord {
  return {
    month: row.month,
    goalAmount: parseGoalAmount(row.goal_amount),
    wasAutoFilled: Boolean(row.was_auto_filled),
  };
}

export async function loadAiInsightsClientProps(): Promise<AiInsightsClientProps> {
  const supabase = await createSupabaseServerClient({ allowSetCookies: false });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("user_plan")
    .eq("id", user.id)
    .maybeSingle();

  if (userError) {
    throw new Error(`Failed to load user plan: ${userError.message}`, {
      cause: userError,
    });
  }

  const userPlan = userRow?.user_plan === "Pro" ? "Pro" : "Standard";
  const isLocked = userPlan !== "Pro";

  const monthlyPeriods = getMonthlyPeriods();
  const currentMonthStart = monthlyPeriods.currentMonthStart;
  const nextMonthStart = getNextMonthStart(currentMonthStart);
  const lastDayOfCurrentMonth = getLastDayOfMonth(currentMonthStart);
  const reminderWindowStart = addDays(lastDayOfCurrentMonth, -6);
  const inReminderWindow = monthlyPeriods.today >= reminderWindowStart;
  const daysUntilReminderWindow = inReminderWindow
    ? 0
    : daysBetween(monthlyPeriods.today, reminderWindowStart);

  let weeklySummaries: InsightSummary[] = [];
  let monthlySummaries: InsightSummary[] = [];
  let monthlyGoals: Record<string, number> = {};
  let currentGoal: SavingsGoalRecord | null = null;
  let nextMonthGoal: SavingsGoalRecord | null = null;

  if (!isLocked) {
    const [{ data: summariesData, error: summariesError }, { data: goalsData, error: goalsError }] =
      await Promise.all([
        supabase
          .from("ai_summaries")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(60),
        supabase
          .from("monthly_savings_goals")
          .select("month, goal_amount, was_auto_filled")
          .eq("user_id", user.id)
          .order("month", { ascending: false })
          .limit(24),
      ]);

    if (summariesError) {
      throw new Error(`Failed to load AI summaries: ${summariesError.message}`, {
        cause: summariesError,
      });
    }

    if (goalsError) {
      throw new Error(`Failed to load savings goals: ${goalsError.message}`, {
        cause: goalsError,
      });
    }

    const summaries = (summariesData ?? [])
      .map((row) => toInsightSummary(row as SummaryRow))
      .filter((summary): summary is InsightSummary => Boolean(summary));

    weeklySummaries = summaries.filter((summary) => summary.periodType === "weekly");
    monthlySummaries = summaries.filter((summary) => summary.periodType === "monthly");

    const goals = (goalsData ?? []).map((row) => normalizeGoal(row as GoalRow));
    monthlyGoals = {};
    for (const goal of goals) {
      monthlyGoals[goal.month] = goal.goalAmount;
    }

    currentGoal = goals.find((goal) => goal.month === currentMonthStart) ?? null;
    nextMonthGoal = goals.find((goal) => goal.month === nextMonthStart) ?? null;
  }

  return {
    isLocked,
    currentMonthLabel: formatMonthLabel(currentMonthStart),
    currentMonthStart,
    nextMonthStart,
    nextMonthLabel: formatMonthLabel(nextMonthStart),
    today: monthlyPeriods.today,
    inReminderWindow,
    daysUntilReminderWindow,
    currentGoal,
    nextMonthGoal,
    monthlyGoals,
    weeklySummaries,
    monthlySummaries,
  };
}
