import fs from "node:fs/promises";
import path from "node:path";
import { createClerkClient } from "@clerk/backend";

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
if (!CLERK_SECRET_KEY) {
  throw new Error("Missing CLERK_SECRET_KEY");
}

const clerkClient = createClerkClient({ secretKey: CLERK_SECRET_KEY });

function makeTemporaryPassword(legacyId) {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `Tmp-${legacyId.slice(0, 8)}-Aa1!-${suffix}`;
}

function requiresPassword(error) {
  if (!error || typeof error !== "object") return false;
  if (error.status !== 422) return false;
  if (!Array.isArray(error.errors)) return false;
  return error.errors.some((entry) => {
    const message = String(entry?.longMessage ?? entry?.message ?? "").toLowerCase();
    return message.includes("password") || message.includes("missing data");
  });
}

function extractEmail(authUser) {
  if (typeof authUser?.email === "string" && authUser.email.length > 0) {
    return authUser.email;
  }
  const first = authUser?.email_addresses?.[0];
  if (first?.email) return first.email;
  if (first?.email_address) return first.email_address;
  return null;
}

function resolveSnapshotPath() {
  const provided = process.argv[2];
  if (provided) return path.resolve(provided);
  throw new Error("Usage: node scripts/migrate/sync-clerk-users.mjs <snapshot.json>");
}

const snapshotPath = resolveSnapshotPath();
const snapshotRaw = await fs.readFile(snapshotPath, "utf8");
const snapshot = JSON.parse(snapshotRaw);
const authUsers = Array.isArray(snapshot.auth_users) ? snapshot.auth_users : [];

const mapping = {};
const created = [];
const unresolved = [];

for (const authUser of authUsers) {
  const legacyId = String(authUser.id);
  const email = extractEmail(authUser);
  let clerkUser = null;

  const byExternalId = await clerkClient.users.getUserList({
    externalId: [legacyId],
    limit: 1,
  });
  clerkUser = byExternalId.data[0] ?? null;

  if (!clerkUser && email) {
    const byEmail = await clerkClient.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });
    clerkUser = byEmail.data[0] ?? null;
  }

  if (!clerkUser && email) {
    try {
      clerkUser = await clerkClient.users.createUser({
        externalId: legacyId,
        emailAddress: [email],
        skipPasswordRequirement: true,
      });
    } catch (error) {
      if (!requiresPassword(error)) {
        throw error;
      }

      clerkUser = await clerkClient.users.createUser({
        externalId: legacyId,
        emailAddress: [email],
        password: makeTemporaryPassword(legacyId),
        skipPasswordChecks: true,
      });
    }
    created.push({ legacyId, clerkId: clerkUser.id, email });
  }

  if (!clerkUser) {
    unresolved.push({ legacyId, email });
    continue;
  }

  if (!clerkUser.externalId) {
    await clerkClient.users.updateUser(clerkUser.id, { externalId: legacyId });
  }

  mapping[legacyId] = clerkUser.id;
}

const outDir = path.resolve("scripts/migrate/out");
await fs.mkdir(outDir, { recursive: true });

const outputPath = path.join(
  outDir,
  `user-id-map-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);

await fs.writeFile(
  outputPath,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      snapshot_path: snapshotPath,
      mapping,
      created,
      unresolved,
    },
    null,
    2
  ),
  "utf8"
);

console.log(`User sync complete: ${outputPath}`);
console.log(`Mapped: ${Object.keys(mapping).length}, Created: ${created.length}, Unresolved: ${unresolved.length}`);
