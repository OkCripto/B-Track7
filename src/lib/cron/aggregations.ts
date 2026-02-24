import type {
  BuildMonthlyPromptInput,
  BuildWeeklyPromptInput,
  MonthlyCategorySnapshot,
  MonthlyCategoryTransactionDetail,
  MonthlyWindowData,
  WeeklyCategorySnapshot,
  WeeklyCategoryTransactionDetail,
  WeeklyWindowData,
} from "@/lib/ai/geminiPromptTemplates";
import type { MonthlyPeriods, WeeklyPeriods } from "@/lib/cron/time";
import { isDateWithinRange } from "@/lib/cron/time";
import type { DateRange } from "@/lib/cron/time";
import type { UserTransaction } from "@/lib/cron/transactions";

type TrendDirection = "increase" | "decrease" | "no change";
type VarianceLevel = "HIGH" | "LOW";

export interface WeeklyAggregationResult {
  promptInput: BuildWeeklyPromptInput;
  week1TransactionCount: number;
}

export interface MonthlyAggregationResult {
  promptInput: Omit<BuildMonthlyPromptInput, "savingsGoal">;
  currentMonthTransactionCount: number;
}

function sum(values: number[]): number {
  return values.reduce((acc, current) => acc + current, 0);
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function getTrendDirection(current: number, previous: number): TrendDirection {
  if (current > previous) return "increase";
  if (current < previous) return "decrease";
  return "no change";
}

function getAbsoluteChangePercent(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return round2(Math.abs(((current - previous) / previous) * 100));
}

function classifyVariance(values: number[]): {
  variance: VarianceLevel;
  classificationHint: string;
} {
  const mean = sum(values) / values.length;
  if (mean === 0) {
    return {
      variance: "LOW",
      classificationHint: "No meaningful fluctuation; spend remained near zero.",
    };
  }

  const varianceRaw =
    values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / values.length;
  const standardDeviation = Math.sqrt(varianceRaw);
  const coefficientOfVariation = standardDeviation / mean;

  if (coefficientOfVariation > 0.25) {
    return {
      variance: "HIGH",
      classificationHint: "Spending fluctuates noticeably across periods.",
    };
  }

  return {
    variance: "LOW",
    classificationHint: "Spending is fairly stable across periods.",
  };
}

function transactionsForRange(
  transactions: UserTransaction[],
  range: DateRange,
): UserTransaction[] {
  return transactions.filter((transaction) =>
    isDateWithinRange(transaction.transactionDate, range),
  );
}

function expenseByCategory(
  transactions: UserTransaction[],
): Map<string, number> {
  const map = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.type !== "expense") continue;
    map.set(
      transaction.categoryName,
      round2((map.get(transaction.categoryName) ?? 0) + transaction.amount),
    );
  }

  return map;
}

function incomeTotal(transactions: UserTransaction[]): number {
  return round2(
    transactions
      .filter((transaction) => transaction.type === "income")
      .reduce((acc, transaction) => acc + transaction.amount, 0),
  );
}

function expenseTotal(transactions: UserTransaction[]): number {
  return round2(
    transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((acc, transaction) => acc + transaction.amount, 0),
  );
}

function collectCategoryNames(
  maps: Map<string, number>[],
): string[] {
  const set = new Set<string>();
  for (const map of maps) {
    for (const key of map.keys()) {
      set.add(key);
    }
  }

  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function buildWeeklyCategorySnapshots(
  categoryNames: string[],
  currentMap: Map<string, number>,
  previousMap: Map<string, number> | null,
): WeeklyCategorySnapshot[] {
  return categoryNames.map((categoryName) => {
    const amountSpent = currentMap.get(categoryName) ?? 0;
    const previousPeriodAmount = previousMap?.get(categoryName) ?? 0;

    return {
      categoryName,
      amountSpent: round2(amountSpent),
      previousPeriodAmount: round2(previousPeriodAmount),
      changePercentage: getAbsoluteChangePercent(
        amountSpent,
        previousPeriodAmount,
      ),
      trendDirection: getTrendDirection(amountSpent, previousPeriodAmount),
    };
  });
}

function buildMonthlyCategorySnapshots(
  categoryNames: string[],
  currentMap: Map<string, number>,
  previousMap: Map<string, number> | null,
): MonthlyCategorySnapshot[] {
  return categoryNames.map((categoryName) => {
    const amountSpent = currentMap.get(categoryName) ?? 0;
    const previousPeriodAmount = previousMap?.get(categoryName) ?? 0;

    return {
      categoryName,
      amountSpent: round2(amountSpent),
      previousPeriodAmount: round2(previousPeriodAmount),
      changePercentage: getAbsoluteChangePercent(
        amountSpent,
        previousPeriodAmount,
      ),
      trendDirection: getTrendDirection(amountSpent, previousPeriodAmount),
    };
  });
}

export function aggregateWeeklyTransactions(
  transactions: UserTransaction[],
  periods: WeeklyPeriods,
): WeeklyAggregationResult {
  const ranges = [periods.week1, periods.week2, periods.week3, periods.week4];
  const periodTransactions = ranges.map((range) =>
    transactionsForRange(transactions, range),
  );

  const expenseMaps = periodTransactions.map((group) => expenseByCategory(group));
  const categoryNames = collectCategoryNames(expenseMaps);

  const windows: WeeklyWindowData[] = ranges.map((range, index) => {
    const currentMap = expenseMaps[index];
    const previousMap = index < expenseMaps.length - 1 ? expenseMaps[index + 1] : null;
    const txInRange = periodTransactions[index];

    return {
      periodStart: range.start,
      periodEnd: range.end,
      categories: buildWeeklyCategorySnapshots(categoryNames, currentMap, previousMap),
      totalSpent: expenseTotal(txInRange),
      totalIncome: incomeTotal(txInRange),
    };
  });

  const categoryTransactionDetails: WeeklyCategoryTransactionDetail[] = categoryNames.map(
    (categoryName) => {
      const values = expenseMaps.map((map) => round2(map.get(categoryName) ?? 0));
      const classified = classifyVariance(values);

      return {
        categoryName,
        week1Amount: values[0],
        week2Amount: values[1],
        week3Amount: values[2],
        week4Amount: values[3],
        variance: classified.variance,
        classificationHint: classified.classificationHint,
      };
    },
  );

  return {
    promptInput: {
      week1: windows[0],
      week2: windows[1],
      week3: windows[2],
      week4: windows[3],
      categoryTransactionDetails,
    },
    week1TransactionCount: periodTransactions[0].length,
  };
}

export function aggregateMonthlyTransactions(
  transactions: UserTransaction[],
  periods: MonthlyPeriods,
): MonthlyAggregationResult {
  const ranges = [periods.current, periods.minus1, periods.minus2, periods.minus3];
  const periodTransactions = ranges.map((range) =>
    transactionsForRange(transactions, range),
  );

  const expenseMaps = periodTransactions.map((group) => expenseByCategory(group));
  const categoryNames = collectCategoryNames(expenseMaps);

  const windows: MonthlyWindowData[] = ranges.map((range, index) => {
    const currentMap = expenseMaps[index];
    const previousMap = index < expenseMaps.length - 1 ? expenseMaps[index + 1] : null;
    const txInRange = periodTransactions[index];
    const spent = expenseTotal(txInRange);
    const income = incomeTotal(txInRange);

    return {
      label: range.label,
      categories: buildMonthlyCategorySnapshots(categoryNames, currentMap, previousMap),
      totalSpent: spent,
      totalIncome: income,
      netSavings: round2(income - spent),
    };
  });

  const categoryTransactionDetails: MonthlyCategoryTransactionDetail[] = categoryNames.map(
    (categoryName) => {
      const current = round2(expenseMaps[0].get(categoryName) ?? 0);
      const minus1 = round2(expenseMaps[1].get(categoryName) ?? 0);
      const minus2 = round2(expenseMaps[2].get(categoryName) ?? 0);
      const minus3 = round2(expenseMaps[3].get(categoryName) ?? 0);
      const classified = classifyVariance([minus3, minus2, minus1, current]);

      return {
        categoryName,
        monthMinus3Amount: minus3,
        monthMinus2Amount: minus2,
        monthMinus1Amount: minus1,
        currentAmount: current,
        varianceAcrossMonths: classified.variance,
      };
    },
  );

  return {
    promptInput: {
      currentMonth: windows[0],
      monthMinus1: windows[1],
      monthMinus2: windows[2],
      monthMinus3: windows[3],
      categoryTransactionDetails,
    },
    currentMonthTransactionCount: periodTransactions[0].length,
  };
}

