import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

const TABLE_ORDER: Array<
  | "transactions"
  | "categories"
  | "assets"
  | "user_settings"
  | "ai_summaries"
  | "monthly_savings_goals"
  | "notifications"
  | "release_notes"
  | "users"
> = [
  "transactions",
  "categories",
  "assets",
  "user_settings",
  "ai_summaries",
  "monthly_savings_goals",
  "notifications",
  "release_notes",
  "users",
];

async function clearTable(ctx: any, table: typeof TABLE_ORDER[number]) {
  const docs = await ctx.db.query(table).collect();
  for (const doc of docs) {
    await ctx.db.delete(doc._id);
  }
}

function asNumber(value: unknown, fallback = Date.now()) {
  const converted = Number(value);
  return Number.isFinite(converted) ? converted : fallback;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map(String);
}

export const replace_snapshot_internal = internalMutation({
  args: {
    snapshot: v.any(),
  },
  returns: v.object({
    counts: v.object({
      users: v.number(),
      assets: v.number(),
      categories: v.number(),
      transactions: v.number(),
      user_settings: v.number(),
      release_notes: v.number(),
      ai_summaries: v.number(),
      monthly_savings_goals: v.number(),
      notifications: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    for (const table of TABLE_ORDER) {
      await clearTable(ctx, table);
    }

    const snapshot = (args.snapshot ?? {}) as Record<string, unknown>;
    const users = Array.isArray(snapshot.users) ? snapshot.users : [];
    const assets = Array.isArray(snapshot.assets) ? snapshot.assets : [];
    const categories = Array.isArray(snapshot.categories) ? snapshot.categories : [];
    const transactions = Array.isArray(snapshot.transactions) ? snapshot.transactions : [];
    const userSettings = Array.isArray(snapshot.user_settings) ? snapshot.user_settings : [];
    const releaseNotes = Array.isArray(snapshot.release_notes) ? snapshot.release_notes : [];
    const aiSummaries = Array.isArray(snapshot.ai_summaries) ? snapshot.ai_summaries : [];
    const monthlySavingsGoals = Array.isArray(snapshot.monthly_savings_goals)
      ? snapshot.monthly_savings_goals
      : [];
    const notifications = Array.isArray(snapshot.notifications) ? snapshot.notifications : [];

    for (const user of users as any[]) {
      await ctx.db.insert("users", {
        id: String(user.id),
        email: user.email ? String(user.email) : undefined,
        user_plan: user.user_plan === "Pro" ? "Pro" : "Standard",
        legacy_id: user.legacy_id ? String(user.legacy_id) : undefined,
        created_at: asNumber(user.created_at),
        updated_at: asNumber(user.updated_at),
      });
    }

    const assetMap = new Map<string, Id<"assets">>();
    for (const asset of assets as any[]) {
      const insertedId = await ctx.db.insert("assets", {
        user_id: String(asset.user_id),
        name: String(asset.name),
        name_normalized: String(asset.name_normalized ?? String(asset.name).toLowerCase()),
        balance: Number(asset.balance ?? 0),
        is_default: Boolean(asset.is_default ?? false),
        created_at: asNumber(asset.created_at),
        updated_at: asNumber(asset.updated_at),
        legacy_id: asset.legacy_id ? String(asset.legacy_id) : undefined,
      });
      if (asset.legacy_id) {
        assetMap.set(`${String(asset.user_id)}:${String(asset.legacy_id)}`, insertedId);
      }
    }

    const categoryMap = new Map<string, Id<"categories">>();
    for (const category of categories as any[]) {
      const insertedId = await ctx.db.insert("categories", {
        user_id: String(category.user_id),
        type: category.type === "income" ? "income" : "expense",
        name: String(category.name),
        name_normalized: String(category.name_normalized ?? String(category.name).toLowerCase()),
        color: category.color ? String(category.color) : undefined,
        is_system: Boolean(category.is_system ?? false),
        created_at: asNumber(category.created_at),
        updated_at: asNumber(category.updated_at),
        legacy_id: category.legacy_id ? String(category.legacy_id) : undefined,
      });
      if (category.legacy_id) {
        categoryMap.set(`${String(category.user_id)}:${String(category.legacy_id)}`, insertedId);
      }
    }

    for (const row of userSettings as any[]) {
      await ctx.db.insert("user_settings", {
        user_id: String(row.user_id),
        monthly_savings_target: Number(row.monthly_savings_target ?? 500),
        use_compact_currency: Boolean(row.use_compact_currency ?? true),
        created_at: asNumber(row.created_at),
        updated_at: asNumber(row.updated_at),
        legacy_id: row.legacy_id ? String(row.legacy_id) : undefined,
      });
    }

    for (const row of releaseNotes as any[]) {
      await ctx.db.insert("release_notes", {
        version: String(row.version),
        title: String(row.title ?? "Product update"),
        description: String(row.description ?? ""),
        released_on: row.released_on ? String(row.released_on) : undefined,
        improvements: toStringArray(row.improvements),
        fixes: toStringArray(row.fixes),
        patches: toStringArray(row.patches),
        created_at: asNumber(row.created_at),
        legacy_id: row.legacy_id ? String(row.legacy_id) : undefined,
      });
    }

    for (const row of aiSummaries as any[]) {
      await ctx.db.insert("ai_summaries", {
        user_id: String(row.user_id),
        period_type: row.period_type === "weekly" ? "weekly" : "monthly",
        period_start: String(row.period_start),
        period_end: String(row.period_end),
        summary: String(row.summary ?? ""),
        suggestions: toStringArray(row.suggestions),
        trend_highlight: String(row.trend_highlight ?? ""),
        savings_commentary: row.savings_commentary ? String(row.savings_commentary) : undefined,
        created_at: asNumber(row.created_at),
        legacy_id: row.legacy_id ? String(row.legacy_id) : undefined,
      });
    }

    for (const row of monthlySavingsGoals as any[]) {
      await ctx.db.insert("monthly_savings_goals", {
        user_id: String(row.user_id),
        month: String(row.month),
        goal_amount: Number(row.goal_amount ?? 0),
        was_auto_filled: Boolean(row.was_auto_filled ?? false),
        created_at: asNumber(row.created_at),
        legacy_id: row.legacy_id ? String(row.legacy_id) : undefined,
      });
    }

    for (const row of notifications as any[]) {
      await ctx.db.insert("notifications", {
        user_id: String(row.user_id),
        reminder_type: String(row.reminder_type ?? "set_savings_goal"),
        target_month: String(row.target_month),
        shown: Boolean(row.shown ?? false),
        created_at: asNumber(row.created_at),
        legacy_id: row.legacy_id ? String(row.legacy_id) : undefined,
      });
    }

    for (const row of transactions as any[]) {
      const userId = String(row.user_id);
      const assetId = assetMap.get(`${userId}:${String(row.asset_legacy_id ?? row.asset_id)}`);
      const categoryId = categoryMap.get(
        `${userId}:${String(row.category_legacy_id ?? row.category_id)}`
      );
      if (!assetId || !categoryId) continue;

      await ctx.db.insert("transactions", {
        user_id: userId,
        asset_id: assetId,
        category_id: categoryId,
        type: row.type === "income" ? "income" : "expense",
        amount: Number(row.amount ?? 0),
        description: String(row.description ?? ""),
        note: row.note ? String(row.note) : undefined,
        transaction_date: String(row.transaction_date),
        created_at: asNumber(row.created_at),
        updated_at: asNumber(row.updated_at),
        legacy_id: row.legacy_id ? String(row.legacy_id) : undefined,
      });
    }

    return {
      counts: {
        users: users.length,
        assets: assets.length,
        categories: categories.length,
        transactions: transactions.length,
        user_settings: userSettings.length,
        release_notes: releaseNotes.length,
        ai_summaries: aiSummaries.length,
        monthly_savings_goals: monthlySavingsGoals.length,
        notifications: notifications.length,
      },
    };
  },
});

export const table_counts_internal = internalQuery({
  args: {},
  returns: v.object({
    users: v.number(),
    assets: v.number(),
    categories: v.number(),
    transactions: v.number(),
    user_settings: v.number(),
    release_notes: v.number(),
    ai_summaries: v.number(),
    monthly_savings_goals: v.number(),
    notifications: v.number(),
  }),
  handler: async (ctx) => {
    const [
      users,
      assets,
      categories,
      transactions,
      userSettings,
      releaseNotes,
      aiSummaries,
      monthlySavingsGoals,
      notifications,
    ] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("assets").collect(),
      ctx.db.query("categories").collect(),
      ctx.db.query("transactions").collect(),
      ctx.db.query("user_settings").collect(),
      ctx.db.query("release_notes").collect(),
      ctx.db.query("ai_summaries").collect(),
      ctx.db.query("monthly_savings_goals").collect(),
      ctx.db.query("notifications").collect(),
    ]);

    return {
      users: users.length,
      assets: assets.length,
      categories: categories.length,
      transactions: transactions.length,
      user_settings: userSettings.length,
      release_notes: releaseNotes.length,
      ai_summaries: aiSummaries.length,
      monthly_savings_goals: monthlySavingsGoals.length,
      notifications: notifications.length,
    };
  },
});
