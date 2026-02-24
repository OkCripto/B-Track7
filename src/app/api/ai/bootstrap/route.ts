import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  bootstrapMonthlySummaryForUser,
  bootstrapWeeklySummaryForUser,
  SummaryGenerationError,
  type SummaryGenerationResult,
} from "@/lib/cron/summary-generation";

export const runtime = "nodejs";

type BootstrapOutcome = {
  status: "processed" | "skipped" | "error";
  period_type: "weekly" | "monthly";
  period_start?: string;
  period_end?: string;
  reason?: string;
  stage?: string;
  error?: string;
};

function toOutcome(result: SummaryGenerationResult): BootstrapOutcome {
  return {
    status: result.status,
    period_type: result.periodType,
    period_start: result.periodStart,
    period_end: result.periodEnd,
    reason: result.reason,
  };
}

function toErrorOutcome(
  periodType: "weekly" | "monthly",
  error: unknown,
): BootstrapOutcome {
  const stage = error instanceof SummaryGenerationError ? error.stage : "fetch";
  const message = error instanceof Error ? error.message : String(error);

  return {
    status: "error",
    period_type: periodType,
    stage,
    error: message,
  };
}

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userPlanRow, error: planError } = await supabase
      .from("users")
      .select("user_plan")
      .eq("id", user.id)
      .maybeSingle();

    if (planError) {
      throw new Error(`Failed to check user plan: ${planError.message}`, {
        cause: planError,
      });
    }

    if (userPlanRow?.user_plan !== "Pro") {
      return NextResponse.json(
        { error: "AI bootstrap is available for Pro users only." },
        { status: 403 },
      );
    }

    const admin = createSupabaseAdminClient();

    let weekly: BootstrapOutcome;
    let monthly: BootstrapOutcome;

    try {
      const result = await bootstrapWeeklySummaryForUser({
        admin,
        userId: user.id,
      });
      weekly = toOutcome(result);
    } catch (error) {
      weekly = toErrorOutcome("weekly", error);
      console.error(
        JSON.stringify({
          level: "error",
          endpoint: "ai-bootstrap",
          user_id: user.id,
          period_type: "weekly",
          stage: weekly.stage ?? "fetch",
          message: weekly.error ?? "Unknown error",
        }),
      );
    }

    try {
      const result = await bootstrapMonthlySummaryForUser({
        admin,
        userId: user.id,
      });
      monthly = toOutcome(result);
    } catch (error) {
      monthly = toErrorOutcome("monthly", error);
      console.error(
        JSON.stringify({
          level: "error",
          endpoint: "ai-bootstrap",
          user_id: user.id,
          period_type: "monthly",
          stage: monthly.stage ?? "fetch",
          message: monthly.error ?? "Unknown error",
        }),
      );
    }

    return NextResponse.json({
      success: true,
      user_id: user.id,
      weekly,
      monthly,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        endpoint: "ai-bootstrap",
        message: error instanceof Error ? error.message : String(error),
      }),
    );

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
