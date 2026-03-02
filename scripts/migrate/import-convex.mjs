import fs from "node:fs/promises";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL");
}

function toMillis(value) {
  if (typeof value === "number") return value;
  if (!value) return Date.now();
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function resolveArgs() {
  const snapshotPath = process.argv[2];
  const mapPath = process.argv[3];
  if (!snapshotPath || !mapPath) {
    throw new Error(
      "Usage: node scripts/migrate/import-convex.mjs <supabase-snapshot.json> <user-id-map.json>"
    );
  }
  return {
    snapshotPath: path.resolve(snapshotPath),
    mapPath: path.resolve(mapPath),
  };
}

const { snapshotPath, mapPath } = resolveArgs();
const snapshotRaw = await fs.readFile(snapshotPath, "utf8");
const mapRaw = await fs.readFile(mapPath, "utf8");
const snapshot = JSON.parse(snapshotRaw);
const mapFile = JSON.parse(mapRaw);
const userMap = mapFile.mapping ?? {};

const tables = snapshot.tables ?? {};

const publicUsers = Array.isArray(tables.users) ? tables.users : [];
const assets = Array.isArray(tables.assets) ? tables.assets : [];
const categories = Array.isArray(tables.categories) ? tables.categories : [];
const transactions = Array.isArray(tables.transactions) ? tables.transactions : [];
const userSettings = Array.isArray(tables.user_settings) ? tables.user_settings : [];
const releaseNotes = Array.isArray(tables.release_notes) ? tables.release_notes : [];
const aiSummaries = Array.isArray(tables.ai_summaries) ? tables.ai_summaries : [];
const monthlySavingsGoals = Array.isArray(tables.monthly_savings_goals)
  ? tables.monthly_savings_goals
  : [];
const notifications = Array.isArray(tables.notifications) ? tables.notifications : [];

const transformed = {
  users: publicUsers
    .map((row) => {
      const mappedUserId = userMap[String(row.id)];
      if (!mappedUserId) return null;
      return {
        id: mappedUserId,
        email: row.email ?? undefined,
        user_plan: row.user_plan === "Pro" ? "Pro" : "Standard",
        legacy_id: String(row.id),
        created_at: toMillis(row.created_at),
        updated_at: toMillis(row.updated_at),
      };
    })
    .filter(Boolean),

  assets: assets
    .map((row) => {
      const mappedUserId = userMap[String(row.user_id)];
      if (!mappedUserId) return null;
      return {
        user_id: mappedUserId,
        name: row.name,
        name_normalized: row.name_normalized ?? String(row.name).toLowerCase(),
        balance: Number(row.balance ?? 0),
        is_default: Boolean(row.is_default ?? false),
        created_at: toMillis(row.created_at),
        updated_at: toMillis(row.updated_at),
        legacy_id: String(row.id),
      };
    })
    .filter(Boolean),

  categories: categories
    .map((row) => {
      const mappedUserId = userMap[String(row.user_id)];
      if (!mappedUserId) return null;
      return {
        user_id: mappedUserId,
        type: row.type === "income" ? "income" : "expense",
        name: row.name,
        name_normalized: row.name_normalized ?? String(row.name).toLowerCase(),
        color: row.color ?? undefined,
        is_system: Boolean(row.is_system ?? false),
        created_at: toMillis(row.created_at),
        updated_at: toMillis(row.updated_at),
        legacy_id: String(row.id),
      };
    })
    .filter(Boolean),

  transactions: transactions
    .map((row) => {
      const mappedUserId = userMap[String(row.user_id)];
      if (!mappedUserId) return null;
      return {
        user_id: mappedUserId,
        asset_legacy_id: String(row.asset_id),
        category_legacy_id: String(row.category_id),
        type: row.type === "income" ? "income" : "expense",
        amount: Number(row.amount ?? 0),
        description: row.description ?? "",
        note: row.note ?? undefined,
        transaction_date: String(row.transaction_date),
        created_at: toMillis(row.created_at),
        updated_at: toMillis(row.updated_at),
        legacy_id: String(row.id),
      };
    })
    .filter(Boolean),

  user_settings: userSettings
    .map((row) => {
      const mappedUserId = userMap[String(row.user_id)];
      if (!mappedUserId) return null;
      return {
        user_id: mappedUserId,
        monthly_savings_target: Number(row.monthly_savings_target ?? 500),
        use_compact_currency: Boolean(row.use_compact_currency ?? true),
        created_at: toMillis(row.created_at),
        updated_at: toMillis(row.updated_at),
        legacy_id: String(row.user_id),
      };
    })
    .filter(Boolean),

  release_notes: releaseNotes.map((row) => ({
    version: String(row.version),
    title: String(row.title ?? "Product update"),
    description: String(row.description ?? ""),
    released_on: row.released_on ? String(row.released_on) : undefined,
    improvements: Array.isArray(row.improvements) ? row.improvements.map(String) : [],
    fixes: Array.isArray(row.fixes) ? row.fixes.map(String) : [],
    patches: Array.isArray(row.patches) ? row.patches.map(String) : [],
    created_at: toMillis(row.created_at),
    legacy_id: String(row.id),
  })),

  ai_summaries: aiSummaries
    .map((row) => {
      const mappedUserId = userMap[String(row.user_id)];
      if (!mappedUserId) return null;
      return {
        user_id: mappedUserId,
        period_type: row.period_type === "weekly" ? "weekly" : "monthly",
        period_start: String(row.period_start),
        period_end: String(row.period_end),
        summary: String(row.summary ?? ""),
        suggestions: Array.isArray(row.suggestions) ? row.suggestions.map(String) : [],
        trend_highlight: String(row.trend_highlight ?? ""),
        savings_commentary: row.savings_commentary ? String(row.savings_commentary) : undefined,
        created_at: toMillis(row.created_at),
        legacy_id: String(row.id),
      };
    })
    .filter(Boolean),

  monthly_savings_goals: monthlySavingsGoals
    .map((row) => {
      const mappedUserId = userMap[String(row.user_id)];
      if (!mappedUserId) return null;
      return {
        user_id: mappedUserId,
        month: String(row.month),
        goal_amount: Number(row.goal_amount ?? 0),
        was_auto_filled: Boolean(row.was_auto_filled ?? false),
        created_at: toMillis(row.created_at),
        legacy_id: String(row.id),
      };
    })
    .filter(Boolean),

  notifications: notifications
    .map((row) => {
      const mappedUserId = userMap[String(row.user_id)];
      if (!mappedUserId) return null;
      return {
        user_id: mappedUserId,
        reminder_type: String(row.reminder_type ?? "set_savings_goal"),
        target_month: String(row.target_month),
        shown: Boolean(row.shown ?? false),
        created_at: toMillis(row.created_at),
        legacy_id: String(row.id),
      };
    })
    .filter(Boolean),
};

const outDir = path.resolve("scripts/migrate/out");
await fs.mkdir(outDir, { recursive: true });
const transformedPath = path.join(
  outDir,
  `convex-snapshot-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);
await fs.writeFile(transformedPath, JSON.stringify(transformed, null, 2), "utf8");

const convex = new ConvexHttpClient(CONVEX_URL);
const result = await convex.mutation("migration:replace_snapshot", {
  snapshot: transformed,
});

console.log(`Convex import complete. Snapshot: ${transformedPath}`);
console.log(result);
