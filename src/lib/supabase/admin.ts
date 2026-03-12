import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type UserPlan = "Standard" | "Pro";

export type AppUser = {
  id: string;
  email: string | null;
  user_plan: UserPlan;
};

let cachedAdminClient: SupabaseClient | null = null;

function requireSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  return value;
}

function requireSupabaseServiceRoleKey() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  return value;
}

export function createSupabaseAdminClient() {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  cachedAdminClient = createClient(
    requireSupabaseUrl(),
    requireSupabaseServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return cachedAdminClient;
}

function normalizeAppUserRow(row: Record<string, unknown>): AppUser {
  return {
    id: String(row.id),
    email: typeof row.email === "string" ? row.email : null,
    user_plan: row.user_plan === "Pro" ? "Pro" : "Standard",
  };
}

async function findExistingAppUserByEmail(email: string) {
  const admin = createSupabaseAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await admin
    .from("users")
    .select("id,email,user_plan")
    .eq("email", normalizedEmail)
    .limit(1);

  if (error) {
    throw new Error(`Failed to query users: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return null;
  }

  return normalizeAppUserRow(data[0] as Record<string, unknown>);
}

async function findAppUserById(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("id,email,user_plan")
    .eq("id", id)
    .limit(1);

  if (error) {
    throw new Error(`Failed to query users by id: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return null;
  }

  return normalizeAppUserRow(data[0] as Record<string, unknown>);
}

async function findAuthUserIdByEmail(email: string) {
  const admin = createSupabaseAdminClient();
  const normalizedEmail = email.toLowerCase();

  let page = 1;
  const perPage = 200;

  while (page <= 50) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    const matched = data.users.find(
      (user) => user.email?.toLowerCase() === normalizedEmail
    );
    if (matched) {
      return matched.id;
    }

    if (data.users.length < perPage) {
      return null;
    }

    page += 1;
  }

  return null;
}

async function createOrFindAuthUserIdByEmail(email: string) {
  const admin = createSupabaseAdminClient();
  const normalizedEmail = email.toLowerCase();

  const created = await admin.auth.admin.createUser({
    email: normalizedEmail,
    email_confirm: true,
    app_metadata: {
      provider: "clerk",
      providers: ["clerk"],
    },
  });

  if (created.data.user?.id) {
    return created.data.user.id;
  }

  const existingId = await findAuthUserIdByEmail(normalizedEmail);
  if (existingId) {
    return existingId;
  }

  if (created.error) {
    throw new Error(`Failed to create shadow auth user: ${created.error.message}`);
  }

  throw new Error("Failed to resolve shadow auth user id");
}

export async function resolveOrProvisionAppUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Email is required to resolve application user");
  }

  const existing = await findExistingAppUserByEmail(normalizedEmail);
  if (existing) {
    return existing;
  }

  const authUserId = await createOrFindAuthUserIdByEmail(normalizedEmail);
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("users")
    .insert({
      id: authUserId,
      email: normalizedEmail,
    })
    .select("id,email,user_plan")
    .single();

  if (!error && data) {
    return normalizeAppUserRow(data as Record<string, unknown>);
  }

  const byId = await findAppUserById(authUserId);
  if (byId) {
    return byId;
  }

  if (error) {
    throw new Error(`Failed to provision application user: ${error.message}`);
  }

  throw new Error("Failed to provision application user");
}
