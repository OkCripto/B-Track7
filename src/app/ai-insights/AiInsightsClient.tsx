"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type HealthStatus = "Good" | "Warning" | "Critical";

export type SavingsGoalRecord = {
  month: string;
  goalAmount: number;
  wasAutoFilled: boolean;
};

export type InsightSummary = {
  id: string;
  periodType: "weekly" | "monthly";
  periodStart: string;
  periodEnd: string;
  summary: string;
  suggestions: string[];
  trendHighlight: string;
  savingsCommentary: string | null;
  categoryHealth: Record<string, HealthStatus> | null;
  createdAt: string;
};

export type AiInsightsClientProps = {
  isLocked: boolean;
  embeddedInDashboard?: boolean;
  currentMonthLabel: string;
  currentMonthStart: string;
  nextMonthStart: string;
  nextMonthLabel: string;
  today: string;
  inReminderWindow: boolean;
  daysUntilReminderWindow: number;
  currentGoal: SavingsGoalRecord | null;
  nextMonthGoal: SavingsGoalRecord | null;
  monthlyGoals: Record<string, number>;
  weeklySummaries: InsightSummary[];
  monthlySummaries: InsightSummary[];
};

type GoalPayload = {
  id: string;
  user_id: string;
  month: string;
  goal_amount: number;
  was_auto_filled: boolean;
  created_at: string;
};

function parseDateKey(dateKey: string) {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split("-");
  return {
    year: Number(yearRaw),
    month: Number(monthRaw),
    day: Number(dayRaw),
  };
}

function dateKeyToUtcDate(dateKey: string): Date {
  const parsed = parseDateKey(dateKey);
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
}

function addDays(dateKey: string, delta: number): string {
  const utcDate = dateKeyToUtcDate(dateKey);
  utcDate.setUTCDate(utcDate.getUTCDate() + delta);
  return utcDate.toISOString().slice(0, 10);
}

function formatDateLabel(dateKey: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateKeyToUtcDate(dateKey));
}

function formatMonthLabel(dateKey: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateKeyToUtcDate(dateKey));
}

function firstDayOfMonth(dateKey: string): string {
  const { year, month } = parseDateKey(dateKey);
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function formatWeekPeriodLabel(start: string, end: string): string {
  const startDate = dateKeyToUtcDate(start);
  const endDate = dateKeyToUtcDate(end);
  const startMonthDay = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(startDate);
  const endMonthDayYear = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(endDate);
  return `Week of ${startMonthDay} - ${endMonthDayYear}`;
}

function formatGeneratedDate(isoValue: string): string {
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3-1.9 3.9L6 9l4.1 2.1L12 15l1.9-3.9L18 9l-4.1-2.1Z" />
      <path d="M5 18v.01" />
      <path d="M19 18v.01" />
      <path d="M12 20v.01" />
    </svg>
  );
}

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.8c.7.5 1.2 1.3 1.3 2.2h5.4c.1-.9.6-1.7 1.3-2.2A7 7 0 0 0 12 2Z" />
    </svg>
  );
}

function PiggyBankIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12a7 7 0 0 1 7-7h3a6 6 0 0 1 6 6v2a5 5 0 0 1-5 5H8a4 4 0 0 1-4-4Z" />
      <path d="M16 7h.01" />
      <path d="M8 18v2" />
      <path d="M16 18v2" />
      <path d="M12 9v3" />
      <path d="M10.5 10.5h3" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function statusClasses(status: HealthStatus) {
  if (status === "Good") {
    return {
      pill: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
      bar: "bg-emerald-400",
      width: "w-full",
    };
  }
  if (status === "Warning") {
    return {
      pill: "border-amber-400/30 bg-amber-500/10 text-amber-300",
      bar: "bg-amber-400",
      width: "w-2/3",
    };
  }
  return {
    pill: "border-rose-400/30 bg-rose-500/10 text-rose-300",
    bar: "bg-rose-400",
    width: "w-1/3",
  };
}

function HealthPills({ data }: { data: Record<string, HealthStatus> | null }) {
  const entries = data ? Object.entries(data) : [];

  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Category health data is not available for this summary yet.
      </p>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {entries.map(([category, status]) => {
        const ui = statusClasses(status);
        return (
          <div key={`${category}-${status}`} className={cn("rounded-lg border px-3 py-2 text-xs", ui.pill)}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate font-medium">{category}</span>
              <span>{status}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-black/25">
              <span className={cn("block h-full rounded-full", ui.bar, ui.width)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ periodType }: { periodType: "weekly" | "monthly" }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/80 p-10 text-center">
      <SparkleIcon className="mx-auto mb-4 h-10 w-10 text-cyan-300" />
      <p className="text-base font-semibold text-foreground">
        Your first AI summary will appear here after your first {periodType === "weekly" ? "weekly" : "monthly"} cycle.
      </p>
    </div>
  );
}

function WeeklyCards({ summaries }: { summaries: InsightSummary[] }) {
  if (summaries.length === 0) {
    return <EmptyState periodType="weekly" />;
  }

  return (
    <div className="space-y-4">
      {summaries.map((summary) => (
        <article key={summary.id} className="rounded-2xl border border-border/70 bg-card/85 p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-cyan-300">
              {formatWeekPeriodLabel(summary.periodStart, summary.periodEnd)}
            </p>
            <p className="text-xs text-muted-foreground">{summary.trendHighlight}</p>
          </div>

          <p className="mb-4 text-sm leading-7 text-foreground/95">{summary.summary}</p>

          <section className="mb-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Suggestions</h3>
            <ul className="space-y-2">
              {summary.suggestions.map((item) => (
                <li key={`${summary.id}-${item}`} className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <LightbulbIcon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Category Health</h3>
            <HealthPills data={summary.categoryHealth} />
          </section>

          <p className="mt-4 text-xs text-muted-foreground">Generated by AI - {formatGeneratedDate(summary.createdAt)}</p>
        </article>
      ))}
    </div>
  );
}

function MonthlyCards({
  summaries,
  monthlyGoals,
}: {
  summaries: InsightSummary[];
  monthlyGoals: Record<string, number>;
}) {
  if (summaries.length === 0) {
    return <EmptyState periodType="monthly" />;
  }

  return (
    <div className="space-y-4">
      {summaries.map((summary) => {
        const monthKey = firstDayOfMonth(summary.periodStart);
        const monthGoalAmount = monthlyGoals[monthKey];

        return (
          <article key={summary.id} className="rounded-2xl border border-border/70 bg-card/85 p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-cyan-300">{formatMonthLabel(summary.periodStart)}</p>
              {Number.isFinite(monthGoalAmount) && (
                <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                  Goal: INR {monthGoalAmount.toLocaleString("en-IN")}
                </span>
              )}
            </div>

            <p className="mb-4 text-sm leading-7 text-foreground/95">{summary.summary}</p>

            <section className="mb-4">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Suggestions</h3>
              <ul className="space-y-2">
                {summary.suggestions.map((item) => (
                  <li key={`${summary.id}-${item}`} className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                    <LightbulbIcon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {summary.savingsCommentary && (
              <section className="mb-4 rounded-lg border border-border/60 bg-muted/30 p-3">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <PiggyBankIcon className="h-4 w-4 text-cyan-300" />
                  Savings Insight
                </h3>
                <p className="text-sm text-foreground/90">{summary.savingsCommentary}</p>
              </section>
            )}

            <section>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Category Health</h3>
              <HealthPills data={summary.categoryHealth} />
            </section>

            <p className="mt-4 text-xs text-muted-foreground">Generated by AI - {formatGeneratedDate(summary.createdAt)}</p>
          </article>
        );
      })}
    </div>
  );
}

export default function AiInsightsClient(props: AiInsightsClientProps) {
  const [activeTab, setActiveTab] = useState<"weekly" | "monthly">("weekly");
  const [currentGoal, setCurrentGoal] = useState<SavingsGoalRecord | null>(props.currentGoal);
  const [nextMonthGoal, setNextMonthGoal] = useState<SavingsGoalRecord | null>(props.nextMonthGoal);
  const [monthlyGoals, setMonthlyGoals] = useState<Record<string, number>>(props.monthlyGoals);
  const [goalInput, setGoalInput] = useState<string>(() => {
    if (props.currentGoal?.wasAutoFilled) return String(props.currentGoal.goalAmount);
    if (props.nextMonthGoal) return String(props.nextMonthGoal.goalAmount);
    return "";
  });
  const [goalError, setGoalError] = useState<string>("");
  const [goalSuccess, setGoalSuccess] = useState<string>("");
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  const autoFillDeadline = useMemo(() => {
    const threeDaysFromNow = addDays(props.today, 3);
    const cutoff = threeDaysFromNow < props.nextMonthStart ? threeDaysFromNow : props.nextMonthStart;
    return formatDateLabel(cutoff);
  }, [props.nextMonthStart, props.today]);

  const goalWidgetMode = useMemo(() => {
    if (currentGoal && !currentGoal.wasAutoFilled) return "locked-current";
    if (currentGoal?.wasAutoFilled) return "autofilled-current";
    if (props.inReminderWindow) return "set-next-month";
    return "waiting";
  }, [currentGoal, props.inReminderWindow]);

  const saveGoal = async (targetMonth: string) => {
    if (props.isLocked) return;

    setGoalError("");
    setGoalSuccess("");

    const normalized = Number(goalInput);
    if (!Number.isInteger(normalized) || normalized < 0) {
      setGoalError("Enter a non-negative whole number.");
      return;
    }

    setIsSavingGoal(true);
    try {
      const response = await fetch("/api/savings-goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: targetMonth,
          goal_amount: normalized,
        }),
      });

      const payload = (await response.json()) as GoalPayload | { error?: unknown };
      if (!response.ok) {
        const messageValue = (payload as { error?: unknown }).error;
        const message =
          typeof messageValue === "string" && messageValue.length > 0
            ? messageValue
            : "Could not save goal.";
        setGoalError(message);
        return;
      }

      const saved = payload as GoalPayload;
      const savedGoal: SavingsGoalRecord = {
        month: saved.month,
        goalAmount: Number(saved.goal_amount),
        wasAutoFilled: Boolean(saved.was_auto_filled),
      };

      if (targetMonth === props.currentMonthStart) {
        setCurrentGoal(savedGoal);
      } else if (targetMonth === props.nextMonthStart) {
        setNextMonthGoal(savedGoal);
      }

      setMonthlyGoals((previous) => ({
        ...previous,
        [savedGoal.month]: savedGoal.goalAmount,
      }));

      setGoalSuccess(`Goal saved for ${formatMonthLabel(saved.month)}.`);
    } catch {
      setGoalError("Could not save goal. Please try again.");
    } finally {
      setIsSavingGoal(false);
    }
  };

  const showNextMonthInput =
    goalWidgetMode === "set-next-month" &&
    (!nextMonthGoal || nextMonthGoal.wasAutoFilled) &&
    !props.isLocked;

  return (
    <div className={cn(!props.embeddedInDashboard && "min-h-screen bg-background text-foreground")}>
      <div
        className={cn(
          "mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8",
          props.embeddedInDashboard && "max-w-none px-0 pb-2 pt-0 sm:px-0 lg:px-0",
        )}
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">AI Insights</h1>
            <p className="text-sm text-muted-foreground">
              {props.isLocked
                ? "This page is available, but insights are locked on your current plan."
                : "Weekly and monthly AI-generated spending insights for Pro members."}
            </p>
          </div>
          {!props.embeddedInDashboard && (
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
            >
              Back to Overview
            </Link>
          )}
        </div>

        {props.isLocked && (
          <section className="mb-6 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <LockIcon className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" />
                <div>
                  <p className="text-sm font-semibold text-cyan-100">Subscribe to get access</p>
                  <p className="text-sm text-cyan-200/90">
                    Unlock AI summaries, suggestions, and savings insights.
                  </p>
                </div>
              </div>
              <Link
                href="/#pricing"
                className="rounded-lg border border-cyan-300/40 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25"
              >
                Subscribe
              </Link>
            </div>
          </section>
        )}

        <div className={cn(props.isLocked && "pointer-events-none select-none opacity-45 blur-[1px]")}>
          <section className="mb-6 rounded-2xl border border-border/70 bg-card/85 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {props.currentMonthLabel}
                </p>
                <h2 className="text-lg font-semibold text-foreground">Savings Goal</h2>
              </div>
              {currentGoal && (
                <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-sm font-semibold text-cyan-200">
                  INR {currentGoal.goalAmount.toLocaleString("en-IN")}
                </span>
              )}
            </div>

            {goalWidgetMode === "locked-current" && currentGoal && (
              <p className="text-sm text-muted-foreground">
                Goal locked for {props.currentMonthLabel}.
              </p>
            )}

            {goalWidgetMode === "autofilled-current" && currentGoal && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Auto-carried from last month - tap to update before {autoFillDeadline}.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={goalInput}
                    onChange={(event) => setGoalInput(event.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-400/25 sm:max-w-xs"
                    placeholder="Goal amount (INR)"
                  />
                  <Button
                    type="button"
                    disabled={isSavingGoal}
                    onClick={() => void saveGoal(props.currentMonthStart)}
                  >
                    {isSavingGoal ? "Saving..." : "Save Goal"}
                  </Button>
                </div>
              </div>
            )}

            {goalWidgetMode === "set-next-month" && (
              <div className="space-y-3">
                <p className="text-sm text-foreground">
                  Set your savings goal for {props.nextMonthLabel}.
                </p>

                {showNextMonthInput && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={goalInput}
                      onChange={(event) => setGoalInput(event.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-400/25 sm:max-w-xs"
                      placeholder="Goal amount (INR)"
                    />
                    <Button
                      type="button"
                      disabled={isSavingGoal}
                      onClick={() => void saveGoal(props.nextMonthStart)}
                    >
                      {isSavingGoal ? "Saving..." : "Save Goal"}
                    </Button>
                  </div>
                )}

                {!showNextMonthInput && nextMonthGoal && (
                  <p className="text-sm text-muted-foreground">
                    Goal already set for {props.nextMonthLabel}: INR {nextMonthGoal.goalAmount.toLocaleString("en-IN")}.
                  </p>
                )}
              </div>
            )}

            {goalWidgetMode === "waiting" && (
              <div className="space-y-1">
                <p className="text-sm text-foreground">
                  No goal set for {props.currentMonthLabel}.
                </p>
                <p className="text-sm text-muted-foreground">
                  Set one for next month in {props.daysUntilReminderWindow} day
                  {props.daysUntilReminderWindow === 1 ? "" : "s"}.
                </p>
              </div>
            )}

            {goalError && <p className="mt-3 text-sm text-rose-400">{goalError}</p>}
            {goalSuccess && <p className="mt-3 text-sm text-emerald-400">{goalSuccess}</p>}
          </section>

          <section className="mb-4">
            <div className="inline-flex rounded-xl border border-border/70 bg-card/80 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("weekly")}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-semibold transition",
                  activeTab === "weekly"
                    ? "bg-cyan-500/15 text-cyan-200"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("monthly")}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-semibold transition",
                  activeTab === "monthly"
                    ? "bg-cyan-500/15 text-cyan-200"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Monthly
              </button>
            </div>
          </section>

          {activeTab === "weekly" ? (
            <WeeklyCards summaries={props.weeklySummaries} />
          ) : (
            <MonthlyCards summaries={props.monthlySummaries} monthlyGoals={monthlyGoals} />
          )}
        </div>
      </div>
    </div>
  );
}
