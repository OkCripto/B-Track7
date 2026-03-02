import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";

const tableValidator = v.union(
  v.literal("assets"),
  v.literal("categories"),
  v.literal("transactions"),
  v.literal("user_settings"),
  v.literal("release_notes"),
  v.literal("ai_summaries"),
  v.literal("monthly_savings_goals"),
  v.literal("notifications"),
  v.literal("users")
);

const operationValidator = v.union(
  v.literal("insert"),
  v.literal("update"),
  v.literal("upsert"),
  v.literal("delete")
);

const singleModeValidator = v.union(
  v.literal("none"),
  v.literal("single"),
  v.literal("maybeSingle")
);

const filterValidator = v.object({
  field: v.string(),
  op: v.union(v.literal("eq"), v.literal("in")),
  value: v.any(),
});

const orderValidator = v.object({
  field: v.string(),
  ascending: v.boolean(),
});

type TableName =
  | "assets"
  | "categories"
  | "transactions"
  | "user_settings"
  | "release_notes"
  | "ai_summaries"
  | "monthly_savings_goals"
  | "notifications"
  | "users";

const OWNED_TABLES = new Set<TableName>([
  "assets",
  "categories",
  "transactions",
  "user_settings",
  "ai_summaries",
  "monthly_savings_goals",
  "notifications",
]);

async function requireUserId(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.subject) {
    throw new ConvexError("Unauthorized");
  }
  return identity.subject;
}

function isOwnedTable(table: TableName) {
  return OWNED_TABLES.has(table);
}

function nowMs() {
  return Date.now();
}

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

function transactionDelta(type: "income" | "expense", amount: number) {
  return type === "income" ? amount : -amount;
}

function getRecordFieldValue(record: Record<string, any>, field: string) {
  if (field === "id") return record.id;
  return record[field];
}

function applyFilters(records: Record<string, any>[], filters: Array<{ field: string; op: "eq" | "in"; value: any }>) {
  if (!filters.length) return records;
  return records.filter((record) =>
    filters.every((filter) => {
      const recordValue = getRecordFieldValue(record, filter.field);
      if (filter.op === "eq") {
        return recordValue === filter.value;
      }
      if (!Array.isArray(filter.value)) return false;
      return filter.value.includes(recordValue);
    })
  );
}

function applyOrders(records: Record<string, any>[], orders: Array<{ field: string; ascending: boolean }>) {
  if (!orders.length) return records;
  const sorted = [...records];
  sorted.sort((left, right) => {
    for (const order of orders) {
      const leftValue = getRecordFieldValue(left, order.field);
      const rightValue = getRecordFieldValue(right, order.field);
      if (leftValue === rightValue) continue;
      if (leftValue === undefined || leftValue === null) return order.ascending ? -1 : 1;
      if (rightValue === undefined || rightValue === null) return order.ascending ? 1 : -1;
      if (leftValue < rightValue) return order.ascending ? -1 : 1;
      if (leftValue > rightValue) return order.ascending ? 1 : -1;
    }
    return 0;
  });
  return sorted;
}

function applySingleMode(
  records: Record<string, any>[],
  mode: "none" | "single" | "maybeSingle"
) {
  if (mode === "none") {
    return records;
  }
  if (mode === "single") {
    if (records.length !== 1) {
      throw new ConvexError("Expected exactly one row");
    }
    return records[0];
  }
  if (records.length === 0) return null;
  if (records.length > 1) {
    throw new ConvexError("Expected at most one row");
  }
  return records[0];
}

function toRecord(doc: any) {
  return {
    id: String(doc._id),
    ...doc,
  };
}

async function listOwnedDocs(ctx: any, table: TableName, userId: string) {
  switch (table) {
    case "assets":
    case "categories":
    case "transactions":
    case "user_settings":
    case "ai_summaries":
    case "monthly_savings_goals":
    case "notifications":
      return await ctx.db
        .query(table)
        .withIndex("by_user_id", (q: any) => q.eq("user_id", userId))
        .collect();
    default:
      throw new ConvexError(`Unsupported owned table: ${table}`);
  }
}

async function listPublicDocs(ctx: any, table: TableName) {
  switch (table) {
    case "release_notes":
      return await ctx.db.query("release_notes").collect();
    case "users":
      return await ctx.db.query("users").collect();
    default:
      throw new ConvexError(`Unsupported public table: ${table}`);
  }
}

async function createAsset(ctx: any, userId: string, value: any) {
  const now = nowMs();
  const name = String(value.name ?? "").trim();
  if (!name) throw new ConvexError("Asset name is required");
  const nameNormalized = normalizeName(name);

  const existing = await ctx.db
    .query("assets")
    .withIndex("by_user_id_name_normalized", (q: any) =>
      q.eq("user_id", userId).eq("name_normalized", nameNormalized)
    )
    .first();
  if (existing) throw new ConvexError("Asset already exists");

  const id = await ctx.db.insert("assets", {
    user_id: userId,
    name,
    name_normalized: nameNormalized,
    balance: Number(value.balance ?? 0),
    is_default: Boolean(value.is_default ?? false),
    created_at: Number(value.created_at ?? now),
    updated_at: Number(value.updated_at ?? now),
    legacy_id: value.legacy_id ? String(value.legacy_id) : undefined,
  });
  const inserted = await ctx.db.get(id);
  return toRecord(inserted);
}

async function createCategory(ctx: any, userId: string, value: any) {
  const now = nowMs();
  const type = value.type === "income" ? "income" : value.type === "expense" ? "expense" : null;
  if (!type) throw new ConvexError("Invalid category type");
  const name = String(value.name ?? "").trim();
  if (!name) throw new ConvexError("Category name is required");
  const nameNormalized = normalizeName(name);

  const existing = await ctx.db
    .query("categories")
    .withIndex("by_user_id_type_name_normalized", (q: any) =>
      q.eq("user_id", userId).eq("type", type).eq("name_normalized", nameNormalized)
    )
    .first();
  if (existing) throw new ConvexError("Category already exists");

  const id = await ctx.db.insert("categories", {
    user_id: userId,
    type,
    name,
    name_normalized: nameNormalized,
    color: value.color ? String(value.color) : undefined,
    is_system: Boolean(value.is_system ?? false),
    created_at: Number(value.created_at ?? now),
    updated_at: Number(value.updated_at ?? now),
    legacy_id: value.legacy_id ? String(value.legacy_id) : undefined,
  });
  const inserted = await ctx.db.get(id);
  return toRecord(inserted);
}

async function patchAssetBalance(ctx: any, assetId: Id<"assets">, delta: number) {
  const asset = await ctx.db.get(assetId);
  if (!asset) {
    throw new ConvexError("Asset not found");
  }
  await ctx.db.patch(assetId, {
    balance: Number(asset.balance) + delta,
    updated_at: nowMs(),
  });
}

async function createTransaction(ctx: any, userId: string, value: any) {
  const now = nowMs();
  const type = value.type === "income" ? "income" : value.type === "expense" ? "expense" : null;
  if (!type) throw new ConvexError("Invalid transaction type");

  const amount = Number(value.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ConvexError("Transaction amount must be greater than 0");
  }

  const description = String(value.description ?? "").trim();
  if (!description) {
    throw new ConvexError("Transaction description is required");
  }

  const assetId = String(value.asset_id) as Id<"assets">;
  const categoryId = String(value.category_id) as Id<"categories">;
  const transactionDate = String(value.transaction_date ?? "").trim();
  if (!transactionDate) {
    throw new ConvexError("Transaction date is required");
  }

  const asset = await ctx.db.get(assetId);
  if (!asset || asset.user_id !== userId) {
    throw new ConvexError("Invalid asset");
  }

  const category = await ctx.db.get(categoryId);
  if (!category || category.user_id !== userId) {
    throw new ConvexError("Invalid category");
  }

  const id = await ctx.db.insert("transactions", {
    user_id: userId,
    asset_id: assetId,
    category_id: categoryId,
    type,
    amount,
    description,
    note: value.note ? String(value.note) : undefined,
    transaction_date: transactionDate,
    created_at: Number(value.created_at ?? now),
    updated_at: Number(value.updated_at ?? now),
    legacy_id: value.legacy_id ? String(value.legacy_id) : undefined,
  });

  await patchAssetBalance(ctx, assetId, transactionDelta(type, amount));

  const inserted = await ctx.db.get(id);
  const categoryDoc = await ctx.db.get(inserted.category_id);
  return {
    ...toRecord(inserted),
    category: categoryDoc ? { name: categoryDoc.name } : null,
  };
}

async function createUserSettings(ctx: any, userId: string, value: any) {
  const now = nowMs();
  const existing = await ctx.db
    .query("user_settings")
    .withIndex("by_user_id", (q: any) => q.eq("user_id", userId))
    .first();
  if (existing) throw new ConvexError("User settings already exists");

  const id = await ctx.db.insert("user_settings", {
    user_id: userId,
    monthly_savings_target: Number(value.monthly_savings_target ?? 500),
    use_compact_currency: Boolean(value.use_compact_currency ?? true),
    created_at: Number(value.created_at ?? now),
    updated_at: Number(value.updated_at ?? now),
    legacy_id: value.legacy_id ? String(value.legacy_id) : undefined,
  });
  const inserted = await ctx.db.get(id);
  return toRecord(inserted);
}

async function createAiSummary(ctx: any, userId: string, value: any) {
  const now = nowMs();
  const periodType = value.period_type === "weekly" ? "weekly" : value.period_type === "monthly" ? "monthly" : null;
  if (!periodType) throw new ConvexError("Invalid period type");
  const suggestions = Array.isArray(value.suggestions)
    ? value.suggestions.filter((item: unknown): item is string => typeof item === "string").map(String)
    : [];
  if (suggestions.length !== 3) {
    throw new ConvexError("Suggestions must contain exactly 3 strings");
  }

  const id = await ctx.db.insert("ai_summaries", {
    user_id: userId,
    period_type: periodType,
    period_start: String(value.period_start ?? ""),
    period_end: String(value.period_end ?? ""),
    summary: String(value.summary ?? ""),
    suggestions,
    trend_highlight: String(value.trend_highlight ?? ""),
    savings_commentary: value.savings_commentary ? String(value.savings_commentary) : undefined,
    created_at: Number(value.created_at ?? now),
    legacy_id: value.legacy_id ? String(value.legacy_id) : undefined,
  });
  const inserted = await ctx.db.get(id);
  return toRecord(inserted);
}

async function createMonthlySavingsGoal(ctx: any, userId: string, value: any) {
  const now = nowMs();
  const month = String(value.month ?? "");
  if (!month) throw new ConvexError("Month is required");

  const existing = await ctx.db
    .query("monthly_savings_goals")
    .withIndex("by_user_id_month", (q: any) => q.eq("user_id", userId).eq("month", month))
    .first();
  if (existing) throw new ConvexError("Monthly savings goal already exists");

  const id = await ctx.db.insert("monthly_savings_goals", {
    user_id: userId,
    month,
    goal_amount: Number(value.goal_amount ?? 0),
    was_auto_filled: Boolean(value.was_auto_filled ?? false),
    created_at: Number(value.created_at ?? now),
    legacy_id: value.legacy_id ? String(value.legacy_id) : undefined,
  });
  const inserted = await ctx.db.get(id);
  return toRecord(inserted);
}

async function createNotification(ctx: any, userId: string, value: any) {
  const now = nowMs();
  const reminderType = String(value.reminder_type ?? "");
  const targetMonth = String(value.target_month ?? "");
  if (!reminderType || !targetMonth) {
    throw new ConvexError("Reminder type and target month are required");
  }

  const existing = await ctx.db
    .query("notifications")
    .withIndex("by_user_id_type_month", (q: any) =>
      q.eq("user_id", userId).eq("reminder_type", reminderType).eq("target_month", targetMonth)
    )
    .first();
  if (existing) throw new ConvexError("Notification already exists");

  const id = await ctx.db.insert("notifications", {
    user_id: userId,
    reminder_type: reminderType,
    target_month: targetMonth,
    shown: Boolean(value.shown ?? false),
    created_at: Number(value.created_at ?? now),
    legacy_id: value.legacy_id ? String(value.legacy_id) : undefined,
  });
  const inserted = await ctx.db.get(id);
  return toRecord(inserted);
}

async function createReleaseNote(ctx: any, value: any) {
  const now = nowMs();
  const version = String(value.version ?? "").trim();
  if (!version) throw new ConvexError("Version is required");

  const existing = await ctx.db
    .query("release_notes")
    .withIndex("by_version", (q: any) => q.eq("version", version))
    .first();
  if (existing) throw new ConvexError("Version already exists");

  const id = await ctx.db.insert("release_notes", {
    version,
    title: String(value.title ?? "Product update"),
    description: String(value.description ?? ""),
    released_on: value.released_on ? String(value.released_on) : undefined,
    improvements: Array.isArray(value.improvements) ? value.improvements.map(String) : [],
    fixes: Array.isArray(value.fixes) ? value.fixes.map(String) : [],
    patches: Array.isArray(value.patches) ? value.patches.map(String) : [],
    created_at: Number(value.created_at ?? now),
    legacy_id: value.legacy_id ? String(value.legacy_id) : undefined,
  });
  const inserted = await ctx.db.get(id);
  return toRecord(inserted);
}

async function updateTransaction(ctx: any, existing: any, value: any, userId: string) {
  const nextType = value.type === undefined ? existing.type : value.type;
  if (nextType !== "income" && nextType !== "expense") {
    throw new ConvexError("Invalid transaction type");
  }

  const nextAmount = value.amount === undefined ? Number(existing.amount) : Number(value.amount);
  if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
    throw new ConvexError("Transaction amount must be greater than 0");
  }

  const nextDescription =
    value.description === undefined ? String(existing.description) : String(value.description).trim();
  if (!nextDescription) {
    throw new ConvexError("Transaction description is required");
  }

  const nextAssetId =
    value.asset_id === undefined ? (existing.asset_id as Id<"assets">) : (String(value.asset_id) as Id<"assets">);
  const nextCategoryId =
    value.category_id === undefined
      ? (existing.category_id as Id<"categories">)
      : (String(value.category_id) as Id<"categories">);

  const nextAsset = await ctx.db.get(nextAssetId);
  if (!nextAsset || nextAsset.user_id !== userId) {
    throw new ConvexError("Invalid asset");
  }

  const nextCategory = await ctx.db.get(nextCategoryId);
  if (!nextCategory || nextCategory.user_id !== userId) {
    throw new ConvexError("Invalid category");
  }

  const oldDelta = transactionDelta(existing.type, Number(existing.amount));
  const newDelta = transactionDelta(nextType, nextAmount);

  if (String(existing.asset_id) === String(nextAssetId)) {
    await patchAssetBalance(ctx, nextAssetId, -oldDelta + newDelta);
  } else {
    await patchAssetBalance(ctx, existing.asset_id as Id<"assets">, -oldDelta);
    await patchAssetBalance(ctx, nextAssetId, newDelta);
  }

  const updates: Record<string, unknown> = {
    type: nextType,
    amount: nextAmount,
    description: nextDescription,
    note: value.note === undefined ? existing.note : value.note ? String(value.note) : undefined,
    asset_id: nextAssetId,
    category_id: nextCategoryId,
    transaction_date:
      value.transaction_date === undefined ? existing.transaction_date : String(value.transaction_date),
    updated_at: nowMs(),
  };

  await ctx.db.patch(existing._id, updates);
  const updated = await ctx.db.get(existing._id);
  return {
    ...toRecord(updated),
    category: nextCategory ? { name: nextCategory.name } : null,
  };
}

async function deleteTransaction(ctx: any, existing: any) {
  const delta = transactionDelta(existing.type, Number(existing.amount));
  await patchAssetBalance(ctx, existing.asset_id as Id<"assets">, -delta);
  await ctx.db.delete(existing._id);
  return toRecord(existing);
}

async function deleteAsset(ctx: any, existing: any, userId: string) {
  if (existing.is_default) {
    throw new ConvexError("Default assets cannot be deleted");
  }
  const linkedTransactions = await ctx.db
    .query("transactions")
    .withIndex("by_asset_id", (q: any) => q.eq("asset_id", existing._id))
    .collect();
  if (linkedTransactions.some((transaction: any) => transaction.user_id === userId)) {
    throw new ConvexError("Cannot delete asset with linked transactions");
  }
  await ctx.db.delete(existing._id);
  return toRecord(existing);
}

async function deleteCategory(ctx: any, existing: any, userId: string) {
  if (existing.is_system) {
    throw new ConvexError("System categories cannot be deleted");
  }
  const linkedTransactions = await ctx.db
    .query("transactions")
    .withIndex("by_category_id", (q: any) => q.eq("category_id", existing._id))
    .collect();
  if (linkedTransactions.some((transaction: any) => transaction.user_id === userId)) {
    throw new ConvexError("Cannot delete category with linked transactions");
  }
  await ctx.db.delete(existing._id);
  return toRecord(existing);
}

export const read = query({
  args: {
    table: tableValidator,
    columns: v.optional(v.string()),
    filters: v.optional(v.array(filterValidator)),
    orders: v.optional(v.array(orderValidator)),
    singleMode: v.optional(singleModeValidator),
  },
  returns: v.object({
    data: v.any(),
  }),
  handler: async (ctx, args) => {
    const table = args.table as TableName;
    const filters = args.filters ?? [];
    const orders = args.orders ?? [];
    const singleMode = args.singleMode ?? "none";

    const userId = isOwnedTable(table) ? await requireUserId(ctx) : null;
    const docs = isOwnedTable(table)
      ? await listOwnedDocs(ctx, table, userId as string)
      : await listPublicDocs(ctx, table);

    let records = docs.map((doc: any) => toRecord(doc));

    if (table === "transactions") {
      const categoryIds = Array.from(
        new Set(records.map((record: Record<string, unknown>) => String(record.category_id)))
      );
      const categories = await Promise.all(
        categoryIds.map(async (categoryId) => ctx.db.get(categoryId as Id<"categories">))
      );
      const categoryNameById = new Map<string, string>();
      for (const category of categories) {
        if (category) {
          categoryNameById.set(String(category._id), category.name);
        }
      }
      records = records.map((record: Record<string, unknown>) => ({
        ...record,
        category: categoryNameById.has(String(record.category_id))
          ? { name: categoryNameById.get(String(record.category_id)) }
          : null,
      }));
    }

    records = applyFilters(records, filters);
    records = applyOrders(records, orders);

    return {
      data: applySingleMode(records, singleMode),
    };
  },
});

export const write = mutation({
  args: {
    table: tableValidator,
    operation: operationValidator,
    values: v.optional(v.any()),
    filters: v.optional(v.array(filterValidator)),
    onConflict: v.optional(v.string()),
    singleMode: v.optional(singleModeValidator),
  },
  returns: v.object({
    data: v.any(),
  }),
  handler: async (ctx, args) => {
    const table = args.table as TableName;
    const operation = args.operation as "insert" | "update" | "upsert" | "delete";
    const values = args.values;
    const filters = args.filters ?? [];
    const singleMode = args.singleMode ?? "none";
    const userId = isOwnedTable(table) ? await requireUserId(ctx) : null;

    if (!isOwnedTable(table) && table !== "release_notes") {
      throw new ConvexError(`Writes to table "${table}" are not supported via this endpoint`);
    }

    if (table === "release_notes" && operation !== "insert" && operation !== "upsert") {
      throw new ConvexError("Release notes writes only support insert/upsert");
    }

    const records: Record<string, any>[] = [];

    if (operation === "insert") {
      const rows = Array.isArray(values) ? values : values === undefined ? [] : [values];
      for (const row of rows) {
        switch (table) {
          case "assets":
            records.push(await createAsset(ctx, userId as string, row));
            break;
          case "categories":
            records.push(await createCategory(ctx, userId as string, row));
            break;
          case "transactions":
            records.push(await createTransaction(ctx, userId as string, row));
            break;
          case "user_settings":
            records.push(await createUserSettings(ctx, userId as string, row));
            break;
          case "ai_summaries":
            records.push(await createAiSummary(ctx, userId as string, row));
            break;
          case "monthly_savings_goals":
            records.push(await createMonthlySavingsGoal(ctx, userId as string, row));
            break;
          case "notifications":
            records.push(await createNotification(ctx, userId as string, row));
            break;
          case "release_notes":
            records.push(await createReleaseNote(ctx, row));
            break;
          default:
            throw new ConvexError(`Unsupported insert table: ${table}`);
        }
      }
    } else if (operation === "upsert") {
      const rows = Array.isArray(values) ? values : values === undefined ? [] : [values];
      for (const row of rows) {
        if (table === "assets") {
          const name = String(row.name ?? "").trim();
          const nameNormalized = normalizeName(name);
          const existing = await ctx.db
            .query("assets")
            .withIndex("by_user_id_name_normalized", (q: any) =>
              q.eq("user_id", userId).eq("name_normalized", nameNormalized)
            )
            .first();

          if (!existing) {
            records.push(await createAsset(ctx, userId as string, row));
          } else {
            const updates: Record<string, unknown> = {
              name,
              name_normalized: nameNormalized,
              balance: row.balance === undefined ? existing.balance : Number(row.balance),
              is_default: row.is_default === undefined ? existing.is_default : Boolean(row.is_default),
              updated_at: nowMs(),
            };
            await ctx.db.patch(existing._id, updates);
            const updated = await ctx.db.get(existing._id);
            records.push(toRecord(updated));
          }
          continue;
        }

        if (table === "categories") {
          const type = row.type === "income" ? "income" : row.type === "expense" ? "expense" : null;
          if (!type) throw new ConvexError("Invalid category type");
          const name = String(row.name ?? "").trim();
          const nameNormalized = normalizeName(name);
          const existing = await ctx.db
            .query("categories")
            .withIndex("by_user_id_type_name_normalized", (q: any) =>
              q.eq("user_id", userId).eq("type", type).eq("name_normalized", nameNormalized)
            )
            .first();

          if (!existing) {
            records.push(await createCategory(ctx, userId as string, row));
          } else {
            const updates: Record<string, unknown> = {
              name,
              name_normalized: nameNormalized,
              color: row.color === undefined ? existing.color : row.color ? String(row.color) : undefined,
              is_system: row.is_system === undefined ? existing.is_system : Boolean(row.is_system),
              updated_at: nowMs(),
            };
            await ctx.db.patch(existing._id, updates);
            const updated = await ctx.db.get(existing._id);
            records.push(toRecord(updated));
          }
          continue;
        }

        if (table === "user_settings") {
          const existing = await ctx.db
            .query("user_settings")
            .withIndex("by_user_id", (q: any) => q.eq("user_id", userId))
            .first();
          if (!existing) {
            records.push(await createUserSettings(ctx, userId as string, row));
          } else {
            await ctx.db.patch(existing._id, {
              monthly_savings_target:
                row.monthly_savings_target === undefined
                  ? existing.monthly_savings_target
                  : Number(row.monthly_savings_target),
              use_compact_currency:
                row.use_compact_currency === undefined
                  ? existing.use_compact_currency
                  : Boolean(row.use_compact_currency),
              updated_at: nowMs(),
            });
            const updated = await ctx.db.get(existing._id);
            records.push(toRecord(updated));
          }
          continue;
        }

        if (table === "release_notes") {
          const version = String(row.version ?? "").trim();
          const existing = await ctx.db
            .query("release_notes")
            .withIndex("by_version", (q: any) => q.eq("version", version))
            .first();

          if (!existing) {
            records.push(await createReleaseNote(ctx, row));
          } else {
            await ctx.db.patch(existing._id, {
              title: row.title === undefined ? existing.title : String(row.title),
              description:
                row.description === undefined ? existing.description : String(row.description),
              released_on:
                row.released_on === undefined
                  ? existing.released_on
                  : row.released_on
                    ? String(row.released_on)
                    : undefined,
              improvements:
                row.improvements === undefined
                  ? existing.improvements
                  : Array.isArray(row.improvements)
                    ? row.improvements.map(String)
                    : [],
              fixes:
                row.fixes === undefined
                  ? existing.fixes
                  : Array.isArray(row.fixes)
                    ? row.fixes.map(String)
                    : [],
              patches:
                row.patches === undefined
                  ? existing.patches
                  : Array.isArray(row.patches)
                    ? row.patches.map(String)
                    : [],
              created_at: row.created_at === undefined ? existing.created_at : Number(row.created_at),
            });
            const updated = await ctx.db.get(existing._id);
            records.push(toRecord(updated));
          }
          continue;
        }

        throw new ConvexError(`Unsupported upsert table: ${table}`);
      }
    } else if (operation === "update" || operation === "delete") {
      const docs = isOwnedTable(table)
        ? await listOwnedDocs(ctx, table, userId as string)
        : await listPublicDocs(ctx, table);
      const filtered = applyFilters(docs.map((doc: any) => toRecord(doc)), filters);
      const docsById = new Map<string, any>(docs.map((doc: any) => [String(doc._id), doc]));

      for (const record of filtered) {
        const existing = docsById.get(String(record.id));
        if (!existing) continue;

        if (operation === "delete") {
          switch (table) {
            case "transactions":
              records.push(await deleteTransaction(ctx, existing));
              break;
            case "assets":
              records.push(await deleteAsset(ctx, existing, userId as string));
              break;
            case "categories":
              records.push(await deleteCategory(ctx, existing, userId as string));
              break;
            case "user_settings":
            case "ai_summaries":
            case "monthly_savings_goals":
            case "notifications":
              await ctx.db.delete(existing._id);
              records.push(toRecord(existing));
              break;
            default:
              throw new ConvexError(`Unsupported delete table: ${table}`);
          }
          continue;
        }

        switch (table) {
          case "transactions":
            records.push(await updateTransaction(ctx, existing, values ?? {}, userId as string));
            break;
          case "assets": {
            const updates: Record<string, unknown> = {};
            if (values?.name !== undefined) {
              const name = String(values.name).trim();
              updates.name = name;
              updates.name_normalized = normalizeName(name);
            }
            if (values?.balance !== undefined) {
              updates.balance = Number(values.balance);
            }
            if (values?.is_default !== undefined) {
              updates.is_default = Boolean(values.is_default);
            }
            updates.updated_at = nowMs();
            await ctx.db.patch(existing._id, updates);
            const updated = await ctx.db.get(existing._id);
            records.push(toRecord(updated));
            break;
          }
          case "categories": {
            if (existing.is_system) {
              throw new ConvexError("System categories cannot be updated");
            }
            const updates: Record<string, unknown> = {};
            if (values?.name !== undefined) {
              const name = String(values.name).trim();
              updates.name = name;
              updates.name_normalized = normalizeName(name);
            }
            if (values?.color !== undefined) {
              updates.color = values.color ? String(values.color) : undefined;
            }
            updates.updated_at = nowMs();
            await ctx.db.patch(existing._id, updates);
            const updated = await ctx.db.get(existing._id);
            records.push(toRecord(updated));
            break;
          }
          case "user_settings": {
            const updates: Record<string, unknown> = {};
            if (values?.monthly_savings_target !== undefined) {
              updates.monthly_savings_target = Number(values.monthly_savings_target);
            }
            if (values?.use_compact_currency !== undefined) {
              updates.use_compact_currency = Boolean(values.use_compact_currency);
            }
            updates.updated_at = nowMs();
            await ctx.db.patch(existing._id, updates);
            const updated = await ctx.db.get(existing._id);
            records.push(toRecord(updated));
            break;
          }
          default:
            throw new ConvexError(`Unsupported update table: ${table}`);
        }
      }
    }

    return {
      data: applySingleMode(records, singleMode),
    };
  },
});
