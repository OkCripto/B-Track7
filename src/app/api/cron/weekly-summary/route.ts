import { NextResponse } from "next/server";
import { assertCronAuth, UnauthorizedCronRequestError } from "@/lib/cron/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWeeklyPeriods } from "@/lib/cron/time";
import { logCronUserError } from "@/lib/cron/logging";
import {
  processWeeklySummaryForUser,
  SummaryGenerationError,
} from "@/lib/cron/summary-generation";

export const runtime = "nodejs";

const ENDPOINT = "weekly-summary";

type ProUserRow = { id: string };

export async function GET(request: Request) {
  try {
    assertCronAuth(request);

    const admin = createSupabaseAdminClient();
    const periods = getWeeklyPeriods();

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

      try {
        const result = await processWeeklySummaryForUser({
          admin,
          userId,
          periods,
        });

        if (result.status === "skipped") {
          skipped += 1;
          continue;
        }

        processed += 1;
      } catch (error) {
        errors += 1;
        logCronUserError({
          endpoint: ENDPOINT,
          userId,
          stage: error instanceof SummaryGenerationError ? error.stage : "fetch",
          error,
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

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
