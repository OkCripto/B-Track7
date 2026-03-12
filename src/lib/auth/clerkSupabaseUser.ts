import { currentUser } from "@clerk/nextjs/server";
import {
  resolveOrProvisionAppUserByEmail,
  type AppUser,
} from "@/lib/supabase/admin";

type ClerkAuthContext = {
  userId: string | null;
  sessionClaims?: unknown;
};

const USER_CACHE_TTL_MS = 5 * 60 * 1000;
const appUserCacheByClerkId = new Map<
  string,
  { user: AppUser; expiresAt: number }
>();

export const MISSING_PRIMARY_EMAIL_MESSAGE =
  "Signed-in user is missing a primary email address.";

function normalizeEmail(value: string | null) {
  return value?.trim().toLowerCase() || null;
}

function extractEmailFromSessionClaims(claims: unknown): string | null {
  if (!claims || typeof claims !== "object") {
    return null;
  }

  const bag = claims as Record<string, unknown>;
  const possibleKeys = ["email", "email_address", "primary_email_address"];

  for (const key of possibleKeys) {
    const value = bag[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

function getCachedAppUser(clerkUserId: string) {
  const cached = appUserCacheByClerkId.get(clerkUserId);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    appUserCacheByClerkId.delete(clerkUserId);
    return null;
  }

  return cached.user;
}

function cacheAppUser(clerkUserId: string, user: AppUser) {
  appUserCacheByClerkId.set(clerkUserId, {
    user,
    expiresAt: Date.now() + USER_CACHE_TTL_MS,
  });
}

export async function resolveAppUserFromClerk(
  authContext: ClerkAuthContext
) {
  if (!authContext.userId) {
    throw new Error("Unauthorized");
  }

  const cached = getCachedAppUser(authContext.userId);
  if (cached) {
    return cached;
  }

  const claimEmail = normalizeEmail(
    extractEmailFromSessionClaims(authContext.sessionClaims)
  );

  let email = claimEmail;
  if (!email) {
    const user = await currentUser();
    email = normalizeEmail(user?.primaryEmailAddress?.emailAddress ?? null);
  }

  if (!email) {
    throw new Error(MISSING_PRIMARY_EMAIL_MESSAGE);
  }

  const appUser = await resolveOrProvisionAppUserByEmail(email);
  cacheAppUser(authContext.userId, appUser);
  return appUser;
}
