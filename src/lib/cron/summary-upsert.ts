import type { SupabaseClient } from "@supabase/supabase-js";

type SummaryPeriodType = "weekly" | "monthly";

export interface SummaryUpsertPayload {
  userId: string;
  periodType: SummaryPeriodType;
  periodStart: string;
  periodEnd: string;
  summary: string;
  suggestions: string[];
  trendHighlight: string;
  savingsCommentary: string | null;
}

export async function upsertAiSummary(
  admin: SupabaseClient,
  payload: SummaryUpsertPayload,
): Promise<void> {
  const { error } = await admin.from("ai_summaries").upsert(
    {
      user_id: payload.userId,
      period_type: payload.periodType,
      period_start: payload.periodStart,
      period_end: payload.periodEnd,
      summary: payload.summary,
      suggestions: payload.suggestions,
      trend_highlight: payload.trendHighlight,
      savings_commentary: payload.savingsCommentary,
    },
    {
      onConflict: "user_id,period_type,period_start,period_end",
    },
  );

  if (error) {
    throw new Error(
      `Failed to upsert summary for user ${payload.userId}: ${error.message}`,
      { cause: error },
    );
  }
}

