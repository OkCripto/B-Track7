export type CronStage =
  | "fetch"
  | "aggregate"
  | "prompt"
  | "gemini"
  | "parse"
  | "validate"
  | "save";

export function logCronUserError(input: {
  endpoint: "weekly-summary" | "monthly-summary" | "savings-reminder";
  userId: string;
  stage: CronStage;
  error: unknown;
  meta?: Record<string, unknown>;
}) {
  const message =
    input.error instanceof Error ? input.error.message : String(input.error);

  console.error(
    JSON.stringify({
      level: "error",
      endpoint: input.endpoint,
      user_id: input.userId,
      stage: input.stage,
      message,
      meta: input.meta ?? null,
    }),
  );
}
