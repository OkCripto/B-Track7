import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const transactionType = v.union(v.literal("income"), v.literal("expense"));
const categoryType = v.union(v.literal("income"), v.literal("expense"));
const periodType = v.union(v.literal("weekly"), v.literal("monthly"));

export default defineSchema({
  users: defineTable({
    id: v.string(),
    email: v.optional(v.string()),
    created_at: v.number(),
    updated_at: v.number(),
    user_plan: v.union(v.literal("Standard"), v.literal("Pro")),
    legacy_id: v.optional(v.string()),
  })
    .index("by_external_id", ["id"])
    .index("by_email", ["email"]),

  assets: defineTable({
    user_id: v.string(),
    name: v.string(),
    name_normalized: v.string(),
    balance: v.number(),
    is_default: v.boolean(),
    created_at: v.number(),
    updated_at: v.number(),
    legacy_id: v.optional(v.string()),
  })
    .index("by_user_id", ["user_id"])
    .index("by_user_id_name_normalized", ["user_id", "name_normalized"])
    .index("by_user_id_is_default", ["user_id", "is_default"])
    .index("by_user_id_legacy_id", ["user_id", "legacy_id"]),

  categories: defineTable({
    user_id: v.string(),
    type: categoryType,
    name: v.string(),
    name_normalized: v.string(),
    color: v.optional(v.string()),
    is_system: v.boolean(),
    created_at: v.number(),
    updated_at: v.number(),
    legacy_id: v.optional(v.string()),
  })
    .index("by_user_id", ["user_id"])
    .index("by_user_id_type", ["user_id", "type"])
    .index("by_user_id_type_name_normalized", ["user_id", "type", "name_normalized"])
    .index("by_user_id_legacy_id", ["user_id", "legacy_id"]),

  transactions: defineTable({
    user_id: v.string(),
    asset_id: v.id("assets"),
    category_id: v.id("categories"),
    type: transactionType,
    amount: v.number(),
    description: v.string(),
    note: v.optional(v.string()),
    transaction_date: v.string(),
    created_at: v.number(),
    updated_at: v.number(),
    legacy_id: v.optional(v.string()),
  })
    .index("by_user_id", ["user_id"])
    .index("by_user_id_transaction_date", ["user_id", "transaction_date"])
    .index("by_user_id_type", ["user_id", "type"])
    .index("by_asset_id", ["asset_id"])
    .index("by_category_id", ["category_id"])
    .index("by_user_id_legacy_id", ["user_id", "legacy_id"]),

  user_settings: defineTable({
    user_id: v.string(),
    monthly_savings_target: v.number(),
    use_compact_currency: v.boolean(),
    created_at: v.number(),
    updated_at: v.number(),
    legacy_id: v.optional(v.string()),
  })
    .index("by_user_id", ["user_id"])
    .index("by_user_id_legacy_id", ["user_id", "legacy_id"]),

  release_notes: defineTable({
    version: v.string(),
    title: v.string(),
    description: v.string(),
    released_on: v.optional(v.string()),
    improvements: v.array(v.string()),
    fixes: v.array(v.string()),
    patches: v.array(v.string()),
    created_at: v.number(),
    legacy_id: v.optional(v.string()),
  })
    .index("by_version", ["version"])
    .index("by_released_on_created_at", ["released_on", "created_at"])
    .index("by_created_at", ["created_at"])
    .index("by_legacy_id", ["legacy_id"]),

  ai_summaries: defineTable({
    user_id: v.string(),
    period_type: periodType,
    period_start: v.string(),
    period_end: v.string(),
    summary: v.string(),
    suggestions: v.array(v.string()),
    trend_highlight: v.string(),
    savings_commentary: v.optional(v.string()),
    created_at: v.number(),
    legacy_id: v.optional(v.string()),
  })
    .index("by_user_id", ["user_id"])
    .index("by_user_id_period_type_created_at", ["user_id", "period_type", "created_at"])
    .index("by_user_id_period_window", ["user_id", "period_type", "period_start", "period_end"])
    .index("by_user_id_legacy_id", ["user_id", "legacy_id"]),

  monthly_savings_goals: defineTable({
    user_id: v.string(),
    month: v.string(),
    goal_amount: v.number(),
    was_auto_filled: v.boolean(),
    created_at: v.number(),
    legacy_id: v.optional(v.string()),
  })
    .index("by_user_id", ["user_id"])
    .index("by_user_id_month", ["user_id", "month"])
    .index("by_user_id_legacy_id", ["user_id", "legacy_id"]),

  notifications: defineTable({
    user_id: v.string(),
    reminder_type: v.string(),
    target_month: v.string(),
    shown: v.boolean(),
    created_at: v.number(),
    legacy_id: v.optional(v.string()),
  })
    .index("by_user_id", ["user_id"])
    .index("by_user_id_shown_created_at", ["user_id", "shown", "created_at"])
    .index("by_user_id_type_month", ["user_id", "reminder_type", "target_month"])
    .index("by_user_id_legacy_id", ["user_id", "legacy_id"]),
});
