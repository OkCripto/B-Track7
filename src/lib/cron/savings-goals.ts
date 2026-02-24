import type { SupabaseClient } from "@supabase/supabase-js";
import type { MonthlySavingsGoalData } from "@/lib/ai/geminiPromptTemplates";

type GoalRow = {
  goal_amount: number;
  was_auto_filled: boolean;
};

function toNumber(value: number | string): number {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function fetchGoalRow(
  admin: SupabaseClient,
  userId: string,
  monthStart: string,
): Promise<GoalRow | null> {
  const { data, error } = await admin
    .from("monthly_savings_goals")
    .select("goal_amount, was_auto_filled")
    .eq("user_id", userId)
    .eq("month", monthStart)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to fetch monthly savings goal for user ${userId}: ${error.message}`,
      { cause: error },
    );
  }

  if (!data) {
    return null;
  }

  return {
    goal_amount: toNumber(data.goal_amount),
    was_auto_filled: Boolean(data.was_auto_filled),
  };
}

export async function resolveCurrentMonthSavingsGoal(params: {
  admin: SupabaseClient;
  userId: string;
  currentMonthStart: string;
  previousMonthStart: string;
  actualSavings: number;
}): Promise<{
  hasGoal: boolean;
  goalAmount: number | null;
  promptGoalData: MonthlySavingsGoalData | null;
}> {
  const { admin, userId, currentMonthStart, previousMonthStart, actualSavings } =
    params;

  let currentGoal = await fetchGoalRow(admin, userId, currentMonthStart);

  if (!currentGoal) {
    const previousGoal = await fetchGoalRow(admin, userId, previousMonthStart);
    if (previousGoal) {
      const { error: upsertError } = await admin.from("monthly_savings_goals").upsert(
        {
          user_id: userId,
          month: currentMonthStart,
          goal_amount: previousGoal.goal_amount,
          was_auto_filled: true,
        },
        {
          onConflict: "user_id,month",
          ignoreDuplicates: true,
        },
      );

      if (upsertError) {
        throw new Error(
          `Failed to autofill monthly savings goal for user ${userId}: ${upsertError.message}`,
          { cause: upsertError },
        );
      }

      currentGoal = await fetchGoalRow(admin, userId, currentMonthStart);
    }
  }

  if (!currentGoal) {
    return {
      hasGoal: false,
      goalAmount: null,
      promptGoalData: null,
    };
  }

  const goalAmount = currentGoal.goal_amount;
  const gapAmount = Math.abs(goalAmount - actualSavings);
  const gapDirection = actualSavings >= goalAmount ? "ahead of" : "short of";

  return {
    hasGoal: true,
    goalAmount,
    promptGoalData: {
      goalAmount,
      actualSavings,
      gapAmount,
      gapDirection,
      wasAutoFilled: currentGoal.was_auto_filled,
    },
  };
}

