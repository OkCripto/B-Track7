type VarianceLevel = "HIGH" | "LOW";
type TrendDirection = "increase" | "decrease" | "no change";
type GapDirection = "short of" | "ahead of";

export interface WeeklyCategorySnapshot {
  categoryName: string;
  amountSpent: number;
  previousPeriodAmount: number;
  changePercentage: number;
  trendDirection: TrendDirection;
}

export interface WeeklyWindowData {
  periodStart: string;
  periodEnd: string;
  categories: WeeklyCategorySnapshot[];
  totalSpent: number;
  totalIncome: number;
}

export interface WeeklyCategoryTransactionDetail {
  categoryName: string;
  week1Amount: number;
  week2Amount: number;
  week3Amount: number;
  week4Amount: number;
  variance: VarianceLevel;
  classificationHint: string;
}

export interface BuildWeeklyPromptInput {
  week1: WeeklyWindowData;
  week2: WeeklyWindowData;
  week3: WeeklyWindowData;
  week4: WeeklyWindowData;
  categoryTransactionDetails: WeeklyCategoryTransactionDetail[];
}

export interface MonthlyCategorySnapshot {
  categoryName: string;
  amountSpent: number;
  previousPeriodAmount: number;
  changePercentage: number;
  trendDirection: TrendDirection;
}

export interface MonthlyWindowData {
  label: string;
  categories: MonthlyCategorySnapshot[];
  totalSpent: number;
  totalIncome: number;
  netSavings: number;
}

export interface MonthlyCategoryTransactionDetail {
  categoryName: string;
  monthMinus3Amount: number;
  monthMinus2Amount: number;
  monthMinus1Amount: number;
  currentAmount: number;
  varianceAcrossMonths: VarianceLevel;
}

export interface MonthlySavingsGoalData {
  goalAmount: number;
  actualSavings: number;
  gapAmount: number;
  gapDirection: GapDirection;
  wasAutoFilled: boolean;
}

export interface BuildMonthlyPromptInput {
  currentMonth: MonthlyWindowData;
  monthMinus1: MonthlyWindowData;
  monthMinus2: MonthlyWindowData;
  monthMinus3: MonthlyWindowData;
  categoryTransactionDetails: MonthlyCategoryTransactionDetail[];
  savingsGoal: MonthlySavingsGoalData | null;
}

export interface WeeklyInsightModelResponse {
  summary: string;
  suggestions: [string, string, string];
  trend_highlight: string;
}

export interface MonthlyInsightModelResponse extends WeeklyInsightModelResponse {
  savings_commentary: string | null;
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const INR_SYMBOL = "\u20B9";
const EM_DASH = "\u2014";

function sanitizeInlineText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function formatInr(value: number): string {
  return inrFormatter.format(value);
}

function formatWeeklyCategories(categories: WeeklyCategorySnapshot[]): string {
  return categories
    .map((category) => {
      const name = sanitizeInlineText(category.categoryName);
      return [
        `  ${name}: ${INR_SYMBOL}${formatInr(category.amountSpent)}`,
        `  Same category last week: ${INR_SYMBOL}${formatInr(category.previousPeriodAmount)}`,
        `  Change: ${Math.abs(category.changePercentage)}% ${category.trendDirection}`,
      ].join("\n");
    })
    .join("\n");
}

function formatMonthlyCategories(categories: MonthlyCategorySnapshot[]): string {
  return categories
    .map((category) => {
      const name = sanitizeInlineText(category.categoryName);
      return [
        `  ${name}: ${INR_SYMBOL}${formatInr(category.amountSpent)}`,
        `  Same category previous month: ${INR_SYMBOL}${formatInr(category.previousPeriodAmount)}`,
        `  Change: ${Math.abs(category.changePercentage)}% ${category.trendDirection}`,
      ].join("\n");
    })
    .join("\n");
}

function formatWeeklyWindow(label: string, week: WeeklyWindowData): string {
  return [
    `${label}: ${sanitizeInlineText(week.periodStart)} to ${sanitizeInlineText(week.periodEnd)}`,
    formatWeeklyCategories(week.categories),
    `Total spent this week: ${INR_SYMBOL}${formatInr(week.totalSpent)}`,
    `Total income this week: ${INR_SYMBOL}${formatInr(week.totalIncome)}`,
  ].join("\n");
}

function formatMonthlyWindow(label: string, month: MonthlyWindowData): string {
  return [
    `${label}:`,
    formatMonthlyCategories(month.categories),
    `Total spent: ${INR_SYMBOL}${formatInr(month.totalSpent)} | Total income: ${INR_SYMBOL}${formatInr(month.totalIncome)}`,
    `Net savings: ${INR_SYMBOL}${formatInr(month.netSavings)}`,
  ].join("\n");
}

function formatWeeklyCategoryDetails(
  details: WeeklyCategoryTransactionDetail[],
): string {
  return details
    .map((item) => {
      const name = sanitizeInlineText(item.categoryName);
      const hint = sanitizeInlineText(item.classificationHint);
      return [
        `  ${name}:`,
        `    Week 1: ${INR_SYMBOL}${formatInr(item.week1Amount)} | Week 2: ${INR_SYMBOL}${formatInr(item.week2Amount)} |`,
        `    Week 3: ${INR_SYMBOL}${formatInr(item.week3Amount)} | Week 4: ${INR_SYMBOL}${formatInr(item.week4Amount)}`,
        `    Variance: ${item.variance} ${EM_DASH} ${hint}`,
      ].join("\n");
    })
    .join("\n");
}

function formatMonthlyCategoryDetails(
  details: MonthlyCategoryTransactionDetail[],
): string {
  return details
    .map((item) => {
      const name = sanitizeInlineText(item.categoryName);
      return [
        `  ${name}:`,
        `    [M-3]: ${INR_SYMBOL}${formatInr(item.monthMinus3Amount)} | [M-2]: ${INR_SYMBOL}${formatInr(item.monthMinus2Amount)} |`,
        `    [M-1]: ${INR_SYMBOL}${formatInr(item.monthMinus1Amount)} | Current: ${INR_SYMBOL}${formatInr(item.currentAmount)}`,
        `    Variance across months: ${item.varianceAcrossMonths}`,
      ].join("\n");
    })
    .join("\n");
}

function formatSavingsGoalSection(
  currentMonthLabel: string,
  savingsGoal: MonthlySavingsGoalData | null,
): string {
  if (!savingsGoal) {
    return "[If no savings goal:]\nSAVINGS GOAL: Not set for this month.";
  }

  const lines = [
    `[SAVINGS GOAL SECTION ${EM_DASH} only include if goal exists:]`,
    `SAVINGS GOAL FOR ${sanitizeInlineText(currentMonthLabel)}: ${INR_SYMBOL}${formatInr(savingsGoal.goalAmount)}`,
    `ACTUAL SAVINGS THIS MONTH: ${INR_SYMBOL}${formatInr(savingsGoal.actualSavings)}`,
    `SAVINGS GAP: ${INR_SYMBOL}${formatInr(savingsGoal.gapAmount)} ${savingsGoal.gapDirection} goal`,
  ];

  if (savingsGoal.wasAutoFilled) {
    lines.push(
      "[If auto-filled:] Note: goal was carried over from",
      "last month as user did not set a new one.",
    );
  }

  return lines.join("\n");
}

export function buildWeeklyGeminiPrompt(input: BuildWeeklyPromptInput): string {
  const weeklyDataSection = [
    `USER SPENDING DATA ${EM_DASH} LAST 4 WEEKS:`,
    "",
    formatWeeklyWindow("Week 1 (most recent)", input.week1),
    "",
    formatWeeklyWindow("Week 2", input.week2),
    "",
    formatWeeklyWindow("Week 3", input.week3),
    "",
    formatWeeklyWindow("Week 4 (oldest)", input.week4),
  ].join("\n");

  const categoryDetailsSection = [
    "CATEGORY TRANSACTION DETAIL (last 4 weeks combined,",
    "so you can determine fixed vs variable):",
    formatWeeklyCategoryDetails(input.categoryTransactionDetails),
  ].join("\n");

  return [
    "You are an intelligent personal finance assistant embedded",
    "in B-Track7, a budget tracking app. Your job is to analyze",
    "a user's real spending data and generate genuinely useful,",
    "specific, and actionable insights.",
    "",
    "IMPORTANT RULES:",
    "- Analyze each category's transaction history to determine",
    "  if it is fixed (same or near-same amount every week/month,",
    "  e.g. rent, EMI, subscriptions) or variable (fluctuates,",
    "  e.g. food, shopping, entertainment, transport)",
    "- NEVER suggest reducing fixed cost categories",
    "- Only target variable categories in suggestions",
    "- Be specific with rupee amounts, never vague",
    "- Do not repeat the same suggestion across multiple weeks",
    "- Tone: friendly, direct, non-judgmental, like a smart",
    "  friend who understands money",
    `- All amounts are in Indian Rupees (${INR_SYMBOL})`,
    "- If a category is consistently improving, acknowledge",
    "  it positively in the summary",
    "- Suggestions must be realistically actionable within",
    "  the next 7 days",
    "",
    weeklyDataSection,
    "",
    categoryDetailsSection,
    "",
    "Respond ONLY in this exact JSON format, no extra text,",
    "no markdown, no code fences:",
    "{",
    '  "summary": "3-4 sentences. Trend-aware narrative of',
    "    this week in context of the last 4 weeks. Mention",
    "    what improved and what got worse. Be specific with",
    '    amounts.",',
    '  "suggestions": [',
    `    "Suggestion 1 ${EM_DASH} specific, rupee-amount-referenced,`,
    '      targets a variable category",',
    '    "Suggestion 2",',
    '    "Suggestion 3"',
    "  ],",
    '  "trend_highlight": "One punchy sentence (max 12 words)',
    "    about the single most notable trend this week.",
    '    This appears on the user\'s dashboard."',
    "}",
  ].join("\n");
}

export function buildMonthlyGeminiPrompt(
  input: BuildMonthlyPromptInput,
): string {
  const monthlyDataSection = [
    `USER SPENDING DATA ${EM_DASH} LAST 4 MONTHS:`,
    "",
    formatMonthlyWindow(
      `${sanitizeInlineText(input.currentMonth.label)} (current)`,
      input.currentMonth,
    ),
    "",
    formatMonthlyWindow(
      sanitizeInlineText(input.monthMinus1.label),
      input.monthMinus1,
    ),
    "",
    formatMonthlyWindow(
      sanitizeInlineText(input.monthMinus2.label),
      input.monthMinus2,
    ),
    "",
    formatMonthlyWindow(
      `${sanitizeInlineText(input.monthMinus3.label)} (oldest)`,
      input.monthMinus3,
    ),
  ].join("\n");

  const categoryDetailsSection = [
    "CATEGORY TRANSACTION DETAIL (to determine fixed vs variable):",
    formatMonthlyCategoryDetails(input.categoryTransactionDetails),
  ].join("\n");

  const savingsGoalSection = formatSavingsGoalSection(
    input.currentMonth.label,
    input.savingsGoal,
  );

  return [
    "You are an intelligent personal finance assistant embedded",
    "in B-Track7, a budget tracking app. Your job is to analyze",
    "a user's real spending data across 4 months and generate",
    "genuinely useful, specific, and actionable monthly insights.",
    "",
    "IMPORTANT RULES:",
    "- Analyze each category's transaction history across all",
    "  4 months to determine if it is fixed (consistent amount",
    "  each month, e.g. rent, EMI, insurance) or variable",
    "  (fluctuates month to month, e.g. food, shopping,",
    "  entertainment, transport)",
    "- NEVER suggest reducing fixed cost categories",
    "- Only target variable categories in suggestions",
    "- Be specific with rupee amounts, never vague",
    "- Tone: friendly, direct, non-judgmental, financially",
    "  literate, like a smart friend who understands money",
    `- All amounts are in Indian Rupees (${INR_SYMBOL})`,
    "- Suggestions must be realistically actionable within",
    "  the next 30 days",
    "- If a savings goal exists, at least one of the 3",
    "  suggestions must directly address closing the",
    "  savings gap with a specific, realistic action",
    "",
    monthlyDataSection,
    "",
    categoryDetailsSection,
    "",
    savingsGoalSection,
    "",
    "Respond ONLY in this exact JSON format, no extra text,",
    "no markdown, no code fences:",
    "{",
    '  "summary": "4-5 sentences. Big picture narrative of',
    "    the month in context of last 4 months. Identify",
    "    trends (improving, worsening, consistent). Mention",
    '    wins and areas of concern. Be specific with amounts.",',
    '  "suggestions": [',
    `    "Suggestion 1 ${EM_DASH} specific, rupee-referenced,`,
    '      targets variable category",',
    '    "Suggestion 2",',
    `    "Suggestion 3 ${EM_DASH} if savings goal exists, this one`,
    "      must reference the goal and give a specific",
    '      action to close the gap"',
    "  ],",
    '  "trend_highlight": "One punchy sentence (max 12 words)',
    "    about the single most notable monthly trend.",
    '    This appears on the user\'s dashboard.",',
    '  "savings_commentary": "2 sentences specifically about',
    "    savings goal progress and what it realistically",
    "    takes to hit it next month. Set to null if no",
    '    savings goal exists for this month."',
    "}",
  ].join("\n");
}
