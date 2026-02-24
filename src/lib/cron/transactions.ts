import type { SupabaseClient } from "@supabase/supabase-js";

export type TransactionType = "income" | "expense";

export interface UserTransaction {
  transactionDate: string;
  amount: number;
  type: TransactionType;
  categoryName: string;
}

type RawTransactionRow = {
  transaction_date: string;
  amount: number | string;
  type: string;
  categories:
    | { name: string | null }
    | { name: string | null }[]
    | null;
};

function resolveCategoryName(
  categories: RawTransactionRow["categories"],
): string {
  if (Array.isArray(categories)) {
    return categories[0]?.name ?? "Uncategorized";
  }

  if (categories && typeof categories === "object") {
    return categories.name ?? "Uncategorized";
  }

  return "Uncategorized";
}

function toNumber(amount: number | string): number {
  if (typeof amount === "number") {
    return amount;
  }

  const value = Number(amount);
  return Number.isFinite(value) ? value : 0;
}

function isTransactionType(value: string): value is TransactionType {
  return value === "income" || value === "expense";
}

export async function fetchUserTransactionsForRange(
  admin: SupabaseClient,
  userId: string,
  startDate: string,
  endDate: string,
): Promise<UserTransaction[]> {
  const { data, error } = await admin
    .from("transactions")
    .select("transaction_date, amount, type, categories(name)")
    .eq("user_id", userId)
    .gte("transaction_date", startDate)
    .lte("transaction_date", endDate)
    .order("transaction_date", { ascending: true });

  if (error) {
    throw new Error(
      `Failed to fetch transactions for user ${userId}: ${error.message}`,
      { cause: error },
    );
  }

  const rows = (data ?? []) as RawTransactionRow[];
  const normalizedRows = rows
    .map((row) => {
      if (!isTransactionType(row.type)) {
        return null;
      }

      return {
        transactionDate: row.transaction_date,
        amount: toNumber(row.amount),
        type: row.type,
        categoryName: resolveCategoryName(row.categories),
      };
    })
    .filter((row): row is UserTransaction => row !== null);

  return normalizedRows.filter(
    (row) => row.categoryName !== "Internal Transfer",
  );
}
