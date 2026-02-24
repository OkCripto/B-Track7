import { NextResponse } from "next/server";
import {
  assertCronAuth,
  UnauthorizedCronRequestError,
} from "@/lib/cron/auth";
import { getCurrentIstDateKey } from "@/lib/cron/time";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logCronUserError } from "@/lib/cron/logging";

export const runtime = "nodejs";

const ENDPOINT = "savings-reminder";

type ProUserRow = { id: string };

function parseDateKey(dateKey: string) {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split("-");
  return {
    year: Number(yearRaw),
    month: Number(monthRaw),
    day: Number(dayRaw),
  };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isInLastSevenDaysOfMonth(todayDateKey: string): boolean {
  const { year, month, day } = parseDateKey(todayDateKey);
  const lastDay = lastDayOfMonth(year, month);
  return day >= Math.max(1, lastDay - 6);
}

function getNextMonthStartDateKey(todayDateKey: string): string {
  const { year, month } = parseDateKey(todayDateKey);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${pad2(nextMonth)}-01`;
}

export async function GET(request: Request) {
  try {
    assertCronAuth(request);

    const todayIst = getCurrentIstDateKey();
    if (!isInLastSevenDaysOfMonth(todayIst)) {
      return NextResponse.json({
        success: true,
        processed: 0,
        skipped: 0,
        errors: 0,
      });
    }

    const admin = createSupabaseAdminClient();
    const nextMonthStart = getNextMonthStartDateKey(todayIst);

    const { data: users, error: usersError } = await admin
      .from("users")
      .select("id")
      .eq("user_plan", "Pro");

    if (usersError) {
      throw new Error(`Failed to fetch Pro users: ${usersError.message}`, {
        cause: usersError,
      });
    }

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of (users ?? []) as ProUserRow[]) {
      const userId = user.id;
      let stage: "fetch" | "save" = "fetch";

      try {
        stage = "fetch";
        const { data: nextMonthGoal, error: nextGoalError } = await admin
          .from("monthly_savings_goals")
          .select("id")
          .eq("user_id", userId)
          .eq("month", nextMonthStart)
          .maybeSingle();

        if (nextGoalError) {
          throw new Error(
            `Failed to check next-month savings goal: ${nextGoalError.message}`,
            { cause: nextGoalError },
          );
        }

        if (nextMonthGoal) {
          skipped += 1;
          continue;
        }

        stage = "save";
        const { error: notificationError } = await admin
          .from("notifications")
          .upsert(
            ({
              user_id: userId,
              reminder_type: "set_savings_goal",
              target_month: nextMonthStart,
              shown: false,
            } as never),
            {
              onConflict: "user_id,reminder_type,target_month",
              ignoreDuplicates: true,
            },
          );

        if (notificationError) {
          throw new Error(
            `Failed to create savings reminder notification: ${notificationError.message}`,
            { cause: notificationError },
          );
        }

        processed += 1;
      } catch (error) {
        errors += 1;
        logCronUserError({
          endpoint: ENDPOINT,
          userId,
          stage,
          error,
          meta: { target_month: nextMonthStart },
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      skipped,
      errors,
    });
  } catch (error) {
    if (error instanceof UnauthorizedCronRequestError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error(
      JSON.stringify({
        level: "error",
        endpoint: ENDPOINT,
        message: error instanceof Error ? error.message : String(error),
      }),
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
