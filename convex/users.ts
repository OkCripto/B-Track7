import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { REQUIRED_ASSETS, DEFAULT_CATEGORIES } from "./defaults";

const userPlanValidator = v.union(v.literal("Standard"), v.literal("Pro"));

function requireUserId(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  return ctx.auth.getUserIdentity().then((identity) => {
    if (!identity?.subject) {
      throw new ConvexError("Unauthorized");
    }
    return identity.subject;
  });
}

async function ensureDefaultAssets(ctx: any, userId: string, now: number) {
  const existing = await ctx.db
    .query("assets")
    .withIndex("by_user_id", (q: any) => q.eq("user_id", userId))
    .collect();
  const existingByNormalized = new Set(existing.map((asset: any) => asset.name_normalized));

  for (const asset of REQUIRED_ASSETS) {
    if (!existingByNormalized.has(asset.name_normalized)) {
      await ctx.db.insert("assets", {
        user_id: userId,
        name: asset.name,
        name_normalized: asset.name_normalized,
        balance: 0,
        is_default: true,
        created_at: now,
        updated_at: now,
      });
    }
  }

  const defaults = await ctx.db
    .query("assets")
    .withIndex("by_user_id", (q: any) => q.eq("user_id", userId))
    .collect();
  for (const asset of defaults) {
    if (REQUIRED_ASSETS.some((required) => required.name_normalized === asset.name_normalized) && !asset.is_default) {
      await ctx.db.patch(asset._id, { is_default: true, updated_at: now });
    }
  }
}

async function ensureDefaultCategories(ctx: any, userId: string, now: number) {
  const existing = await ctx.db
    .query("categories")
    .withIndex("by_user_id", (q: any) => q.eq("user_id", userId))
    .collect();
  const existingKeys = new Set(
    existing.map((category: any) => `${category.type}:${category.name_normalized}`)
  );

  for (const category of DEFAULT_CATEGORIES) {
    const nameNormalized = category.name.toLowerCase();
    const key = `${category.type}:${nameNormalized}`;
    if (existingKeys.has(key)) continue;

    await ctx.db.insert("categories", {
      user_id: userId,
      type: category.type,
      name: category.name,
      name_normalized: nameNormalized,
      color: category.color,
      is_system: category.is_system,
      created_at: now,
      updated_at: now,
    });
  }
}

async function ensureDefaultSettings(ctx: any, userId: string, now: number) {
  const existing = await ctx.db
    .query("user_settings")
    .withIndex("by_user_id", (q: any) => q.eq("user_id", userId))
    .first();
  if (existing) return;

  await ctx.db.insert("user_settings", {
    user_id: userId,
    monthly_savings_target: 500,
    use_compact_currency: true,
    created_at: now,
    updated_at: now,
  });
}

export const ensure_current_user = mutation({
  args: {
    email: v.optional(v.string()),
    user_plan: v.optional(userPlanValidator),
    legacy_id: v.optional(v.string()),
  },
  returns: v.object({
    id: v.string(),
    email: v.optional(v.string()),
    user_plan: userPlanValidator,
  }),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("id", userId))
      .first();

    if (!existing) {
      await ctx.db.insert("users", {
        id: userId,
        email: args.email,
        user_plan: args.user_plan ?? "Standard",
        legacy_id: args.legacy_id,
        created_at: now,
        updated_at: now,
      });
    } else {
      const updates: Record<string, unknown> = { updated_at: now };
      if (args.email !== undefined && args.email !== existing.email) {
        updates.email = args.email;
      }
      if (args.legacy_id && !existing.legacy_id) {
        updates.legacy_id = args.legacy_id;
      }
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(existing._id, updates);
      }
    }

    await ensureDefaultAssets(ctx, userId, now);
    await ensureDefaultCategories(ctx, userId, now);
    await ensureDefaultSettings(ctx, userId, now);

    const user = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("id", userId))
      .first();

    if (!user) {
      throw new ConvexError("Failed to initialize user");
    }

    return {
      id: user.id,
      email: user.email,
      user_plan: user.user_plan,
    };
  },
});

export const get_current_user = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      id: v.string(),
      email: v.optional(v.string()),
      user_plan: userPlanValidator,
      created_at: v.number(),
      updated_at: v.number(),
    })
  ),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("id", userId))
      .first();

    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      user_plan: user.user_plan,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  },
});
