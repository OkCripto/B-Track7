import fs from "node:fs/promises";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL");
}

const transformedSnapshotPath = process.argv[2];
if (!transformedSnapshotPath) {
  throw new Error("Usage: node scripts/migrate/verify-parity.mjs <convex-snapshot.json>");
}

const snapshotRaw = await fs.readFile(path.resolve(transformedSnapshotPath), "utf8");
const snapshot = JSON.parse(snapshotRaw);

const expected = {
  users: Array.isArray(snapshot.users) ? snapshot.users.length : 0,
  assets: Array.isArray(snapshot.assets) ? snapshot.assets.length : 0,
  categories: Array.isArray(snapshot.categories) ? snapshot.categories.length : 0,
  transactions: Array.isArray(snapshot.transactions) ? snapshot.transactions.length : 0,
  user_settings: Array.isArray(snapshot.user_settings) ? snapshot.user_settings.length : 0,
  release_notes: Array.isArray(snapshot.release_notes) ? snapshot.release_notes.length : 0,
  ai_summaries: Array.isArray(snapshot.ai_summaries) ? snapshot.ai_summaries.length : 0,
  monthly_savings_goals: Array.isArray(snapshot.monthly_savings_goals)
    ? snapshot.monthly_savings_goals.length
    : 0,
  notifications: Array.isArray(snapshot.notifications) ? snapshot.notifications.length : 0,
};

const convex = new ConvexHttpClient(CONVEX_URL);
const actual = await convex.query("migration:table_counts", {});

const rows = Object.keys(expected).map((table) => ({
  table,
  expected: expected[table],
  actual: actual[table],
  match: expected[table] === actual[table],
}));

console.table(rows);

const mismatch = rows.filter((row) => !row.match);
if (mismatch.length > 0) {
  process.exitCode = 1;
}
