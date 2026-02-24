import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function isValidPeriodType(value: string | null): value is "weekly" | "monthly" {
  return value === "weekly" || value === "monthly";
}

function parseLimit(value: string | null): number | null {
  if (value === null) return DEFAULT_LIMIT;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return Math.min(parsed, MAX_LIMIT);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const periodType = request.nextUrl.searchParams.get("period_type");
    if (!isValidPeriodType(periodType)) {
      return NextResponse.json(
        { error: "period_type must be either 'weekly' or 'monthly'." },
        { status: 400 },
      );
    }

    const limit = parseLimit(request.nextUrl.searchParams.get("limit"));
    if (limit === null) {
      return NextResponse.json(
        { error: "limit must be a positive integer." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("ai_summaries")
      .select("*")
      .eq("user_id", user.id)
      .eq("period_type", periodType)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch summaries: ${error.message}`, {
        cause: error,
      });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        endpoint: "summaries",
        message: error instanceof Error ? error.message : String(error),
      }),
    );

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
