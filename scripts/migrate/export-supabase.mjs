import fs from "node:fs/promises";
import path from "node:path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const TABLES = [
  "users",
  "assets",
  "categories",
  "transactions",
  "user_settings",
  "release_notes",
  "ai_summaries",
  "monthly_savings_goals",
  "notifications",
];

async function fetchTableRows(table) {
  const rows = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=${pageSize}&offset=${offset}`;
    const response = await fetch(url, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to fetch ${table}: ${response.status} ${body}`);
    }

    const data = await response.json();
    rows.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return rows;
}

async function fetchAuthUsers() {
  const users = [];
  const perPage = 200;
  let page = 1;

  while (true) {
    const url = `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=${perPage}`;
    const response = await fetch(url, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to fetch auth users: ${response.status} ${body}`);
    }

    const payload = await response.json();
    const pageUsers = Array.isArray(payload) ? payload : payload.users ?? [];
    users.push(...pageUsers);
    if (pageUsers.length < perPage) break;
    page += 1;
  }

  return users;
}

const outDir = path.resolve("scripts/migrate/out");
await fs.mkdir(outDir, { recursive: true });

const snapshot = {
  exported_at: new Date().toISOString(),
  auth_users: await fetchAuthUsers(),
  tables: {},
};

for (const table of TABLES) {
  snapshot.tables[table] = await fetchTableRows(table);
}

const outputPath = path.join(
  outDir,
  `supabase-snapshot-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);
await fs.writeFile(outputPath, JSON.stringify(snapshot, null, 2), "utf8");

console.log(`Export complete: ${outputPath}`);
