import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveAppUserFromClerk } from "@/lib/auth/clerkSupabaseUser";

type Filter = {
  field: string;
  op: "eq" | "in";
  value: unknown;
};

type Order = {
  field: string;
  ascending: boolean;
};

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

type SingleMode = "none" | "single" | "maybeSingle";

type ReadPayload = {
  kind: "read";
  table: TableName;
  columns?: string;
  filters?: Filter[];
  orders?: Order[];
  singleMode?: SingleMode;
};

type WritePayload = {
  kind: "write";
  table: TableName;
  operation: "insert" | "update" | "upsert" | "delete";
  values?: unknown;
  filters?: Filter[];
  onConflict?: string;
  singleMode?: SingleMode;
};

type RequestPayload = ReadPayload | WritePayload;

const ALLOWED_TABLES = new Set<TableName>([
  "assets",
  "categories",
  "transactions",
  "user_settings",
  "release_notes",
  "ai_summaries",
  "monthly_savings_goals",
  "notifications",
  "users",
]);

const WRITABLE_TABLES = new Set<TableName>([
  "assets",
  "categories",
  "transactions",
  "user_settings",
  "ai_summaries",
  "monthly_savings_goals",
  "notifications",
]);

const OWNED_TABLES = new Set<TableName>([
  "assets",
  "categories",
  "transactions",
  "user_settings",
  "ai_summaries",
  "monthly_savings_goals",
  "notifications",
]);

function getSingleMode(mode: RequestPayload["singleMode"]): SingleMode {
  return mode ?? "none";
}

function throwIfFilterTargetsAnotherUser(
  filters: Filter[] | undefined,
  userField: "user_id" | "id",
  userId: string
) {
  for (const filter of filters ?? []) {
    if (filter.field !== userField) {
      continue;
    }

    if (filter.op === "eq" && String(filter.value) !== userId) {
      throw new Error("Forbidden");
    }

    if (filter.op === "in") {
      if (!Array.isArray(filter.value)) {
        throw new Error(`Invalid in-filter for ${userField}`);
      }
      const values = filter.value.map((value) => String(value));
      if (!values.includes(userId)) {
        throw new Error("Forbidden");
      }
    }
  }
}

function enforceOwnershipFilters(
  table: TableName,
  filters: Filter[] | undefined,
  userId: string
) {
  const next = [...(filters ?? [])];

  if (OWNED_TABLES.has(table)) {
    throwIfFilterTargetsAnotherUser(filters, "user_id", userId);
    next.push({ field: "user_id", op: "eq", value: userId });
  }

  if (table === "users") {
    throwIfFilterTargetsAnotherUser(filters, "id", userId);
    next.push({ field: "id", op: "eq", value: userId });
  }

  return next;
}

function ensureObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected object payload");
  }
  return value as Record<string, unknown>;
}

function normalizeOwnedWriteValues(
  values: unknown,
  userId: string
): Record<string, unknown> | Record<string, unknown>[] {
  if (Array.isArray(values)) {
    return values.map((value) => ({
      ...ensureObject(value),
      user_id: userId,
    }));
  }

  return {
    ...ensureObject(values),
    user_id: userId,
  };
}

function applyFilters(query: any, filters: Filter[]) {
  let next = query;
  for (const filter of filters) {
    if (filter.op === "eq") {
      next = next.eq(filter.field, filter.value);
      continue;
    }

    if (filter.op === "in") {
      if (!Array.isArray(filter.value)) {
        throw new Error(`Filter "${filter.field}" with op=in expects an array`);
      }
      next = next.in(filter.field, filter.value);
      continue;
    }
  }
  return next;
}

function applyOrders(query: any, orders: Order[] | undefined) {
  let next = query;
  for (const order of orders ?? []) {
    next = next.order(order.field, { ascending: order.ascending });
  }
  return next;
}

async function executeWithSingleMode(query: any, singleMode: SingleMode) {
  if (singleMode === "single") {
    return query.single();
  }
  if (singleMode === "maybeSingle") {
    return query.maybeSingle();
  }
  return query;
}

export async function POST(request: Request) {
  const authObject = await auth();
  if (!authObject.userId) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized" } },
      { status: 401 }
    );
  }

  try {
    const appUser = await resolveAppUserFromClerk(authObject);
    const payload = (await request.json()) as RequestPayload;

    if (!ALLOWED_TABLES.has(payload.table)) {
      return NextResponse.json(
        { data: null, error: { message: `Unsupported table: ${payload.table}` } },
        { status: 400 }
      );
    }

    const singleMode = getSingleMode(payload.singleMode);
    const supabase = createSupabaseAdminClient();

    if (payload.kind === "read") {
      const filters = enforceOwnershipFilters(payload.table, payload.filters, appUser.id);
      let query = supabase
        .from(payload.table)
        .select(payload.columns?.trim() || "*");

      query = applyFilters(query, filters);
      query = applyOrders(query, payload.orders);

      const { data, error } = await executeWithSingleMode(query, singleMode);
      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json({ data, error: null }, { status: 200 });
    }

    if (!WRITABLE_TABLES.has(payload.table)) {
      return NextResponse.json(
        { data: null, error: { message: `Writes to table "${payload.table}" are not supported` } },
        { status: 403 }
      );
    }

    const filters = enforceOwnershipFilters(payload.table, payload.filters, appUser.id);
    const shouldSelectRows = singleMode !== "none";
    let query: any;

    if (payload.operation === "insert") {
      if (payload.values == null) {
        throw new Error("Insert requires values");
      }

      const values = OWNED_TABLES.has(payload.table)
        ? normalizeOwnedWriteValues(payload.values, appUser.id)
        : payload.values;

      query = supabase.from(payload.table).insert(values);
      if (shouldSelectRows) {
        query = query.select("*");
      }
      const { data, error } = await executeWithSingleMode(query, singleMode);
      if (error) {
        throw new Error(error.message);
      }
      return NextResponse.json({ data, error: null }, { status: 200 });
    }

    if (payload.operation === "upsert") {
      if (payload.values == null) {
        throw new Error("Upsert requires values");
      }

      const values = OWNED_TABLES.has(payload.table)
        ? normalizeOwnedWriteValues(payload.values, appUser.id)
        : payload.values;

      query = supabase.from(payload.table).upsert(
        values,
        payload.onConflict
          ? {
              onConflict: payload.onConflict,
            }
          : undefined
      );
      if (shouldSelectRows) {
        query = query.select("*");
      }
      const { data, error } = await executeWithSingleMode(query, singleMode);
      if (error) {
        throw new Error(error.message);
      }
      return NextResponse.json({ data, error: null }, { status: 200 });
    }

    if (payload.operation === "update") {
      if (payload.values == null) {
        throw new Error("Update requires values");
      }

      const values = OWNED_TABLES.has(payload.table)
        ? normalizeOwnedWriteValues(ensureObject(payload.values), appUser.id)
        : ensureObject(payload.values);

      query = supabase.from(payload.table).update(values);
      query = applyFilters(query, filters);
      if (shouldSelectRows) {
        query = query.select("*");
      }
      const { data, error } = await executeWithSingleMode(query, singleMode);
      if (error) {
        throw new Error(error.message);
      }
      return NextResponse.json({ data, error: null }, { status: 200 });
    }

    if (payload.operation === "delete") {
      query = supabase.from(payload.table).delete();
      query = applyFilters(query, filters);
      if (shouldSelectRows) {
        query = query.select("*");
      }
      const { data, error } = await executeWithSingleMode(query, singleMode);
      if (error) {
        throw new Error(error.message);
      }
      return NextResponse.json({ data, error: null }, { status: 200 });
    }

    return NextResponse.json(
      { data: null, error: { message: `Unsupported operation: ${payload.operation}` } },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Forbidden" ? 403 : 400;
    return NextResponse.json(
      { data: null, error: { message } },
      { status }
    );
  }
}
