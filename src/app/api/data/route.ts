import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { api } from "../../../../convex/_generated/api";
import { createAuthedConvexClient } from "@/lib/convex/server";

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

type ReadPayload = {
  kind: "read";
  table: TableName;
  columns?: string;
  filters?: Filter[];
  orders?: Order[];
  singleMode?: "none" | "single" | "maybeSingle";
};

type WritePayload = {
  kind: "write";
  table: TableName;
  operation: "insert" | "update" | "upsert" | "delete";
  values?: unknown;
  filters?: Filter[];
  onConflict?: string;
  singleMode?: "none" | "single" | "maybeSingle";
};

type RequestPayload = ReadPayload | WritePayload;

function getSingleMode(mode: RequestPayload["singleMode"]) {
  return mode ?? "none";
}

export async function POST(request: Request) {
  const authObject = await auth();
  if (!authObject.userId) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized" } },
      { status: 401 }
    );
  }

  const payload = (await request.json()) as RequestPayload;
  const client = await createAuthedConvexClient();

  if (!client) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized" } },
      { status: 401 }
    );
  }

  try {
    if (payload.kind === "read") {
      const result = await client.query(api.data.read, {
        table: payload.table,
        columns: payload.columns,
        filters: payload.filters,
        orders: payload.orders,
        singleMode: getSingleMode(payload.singleMode),
      });
      return NextResponse.json({ data: result.data, error: null }, { status: 200 });
    }

    const result = await client.mutation(api.data.write, {
      table: payload.table,
      operation: payload.operation,
      values: payload.values,
      filters: payload.filters,
      onConflict: payload.onConflict,
      singleMode: getSingleMode(payload.singleMode),
    });
    return NextResponse.json({ data: result.data, error: null }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { data: null, error: { message } },
      { status: 400 }
    );
  }
}
