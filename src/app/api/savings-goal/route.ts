import { NextResponse } from "next/server";
import { getMonthlyPeriods } from "@/lib/cron/time";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  processMonthlySummaryForUser,
  SummaryGenerationError,
} from "@/lib/cron/summary-generation";

export const runtime = "nodejs";

type SavingsGoalBody = {
  month?: unknown;
  goal_amount?: unknown;
};

function parseMonthStart(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-01$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function parseGoalAmount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return null;
  }

  return value;
}

function getNextMonthStart(currentMonthStart: string): string {
  const [yearRaw, monthRaw] = currentMonthStart.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (month === 12) {
    return `${year + 1}-01-01`;
  }

  return `${year}-${String(month + 1).padStart(2, "0")}-01`;
}

async function getAuthenticatedUserId() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { supabase, userId: null as string | null };
  }

  return { supabase, userId: user.id };
}

async function refreshCurrentMonthSummaryAfterGoalSave(userId: string) {
  try {
    const admin = createSupabaseAdminClient();
    const periods = getMonthlyPeriods();
    await processMonthlySummaryForUser({
      admin,
      userId,
      periods,
      includeSavingsGoal: true,
    });
  } catch (error) {
    const stage = error instanceof SummaryGenerationError ? error.stage : "fetch";
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        level: "error",
        endpoint: "savings-goal",
        user_id: userId,
        stage,
        message,
        meta: { action: "refresh_current_month_summary_after_goal_save" },
      }),
    );
  }
}

export async function GET() {
  try {
    const { supabase, userId } = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentMonthStart } = getMonthlyPeriods();

    const { data, error } = await supabase
      .from("monthly_savings_goals")
      .select("id, user_id, month, goal_amount, was_auto_filled, created_at")
      .eq("user_id", userId)
      .eq("month", currentMonthStart)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch savings goal: ${error.message}`, {
        cause: error,
      });
    }

    return NextResponse.json(data ?? null);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        endpoint: "savings-goal",
        method: "GET",
        message: error instanceof Error ? error.message : String(error),
      }),
    );

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, userId } = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: SavingsGoalBody;
    try {
      body = (await request.json()) as SavingsGoalBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const month = parseMonthStart(body.month);
    const goalAmount = parseGoalAmount(body.goal_amount);

    if (!month) {
      return NextResponse.json(
        { error: "month must be a valid YYYY-MM-01 string." },
        { status: 400 },
      );
    }

    if (goalAmount === null) {
      return NextResponse.json(
        { error: "goal_amount must be a non-negative integer." },
        { status: 400 },
      );
    }

    const { currentMonthStart } = getMonthlyPeriods();
    const nextMonthStart = getNextMonthStart(currentMonthStart);

    if (month !== currentMonthStart && month !== nextMonthStart) {
      return NextResponse.json(
        { error: "Goals can only be set for the current or next month." },
        { status: 400 },
      );
    }

    const { data: existing, error: existingError } = await supabase
      .from("monthly_savings_goals")
      .select("id, was_auto_filled")
      .eq("user_id", userId)
      .eq("month", month)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Failed to check existing savings goal record: ${existingError.message}`,
        { cause: existingError },
      );
    }

    if (existing && !existing.was_auto_filled) {
      return NextResponse.json(
        { error: "Savings goal is locked and cannot be overwritten." },
        { status: 409 },
      );
    }

    if (existing && existing.was_auto_filled) {
      const { data: updated, error: updateError } = await supabase
        .from("monthly_savings_goals")
        .update({
          goal_amount: goalAmount,
          was_auto_filled: false,
        })
        .eq("id", existing.id)
        .eq("user_id", userId)
        .select("id, user_id, month, goal_amount, was_auto_filled, created_at")
        .single();

      if (updateError) {
        throw new Error(`Failed to update savings goal: ${updateError.message}`, {
          cause: updateError,
        });
      }

      if (month === currentMonthStart) {
        await refreshCurrentMonthSummaryAfterGoalSave(userId);
      }
      return NextResponse.json(updated);
    }

    const { data: inserted, error: insertError } = await supabase
      .from("monthly_savings_goals")
      .insert({
        user_id: userId,
        month,
        goal_amount: goalAmount,
        was_auto_filled: false,
      })
      .select("id, user_id, month, goal_amount, was_auto_filled, created_at")
      .single();

    if (insertError) {
      throw new Error(`Failed to create savings goal: ${insertError.message}`, {
        cause: insertError,
      });
    }

    if (month === currentMonthStart) {
      await refreshCurrentMonthSummaryAfterGoalSave(userId);
    }
    return NextResponse.json(inserted, { status: 201 });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        endpoint: "savings-goal",
        method: "POST",
        message: error instanceof Error ? error.message : String(error),
      }),
    );

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
