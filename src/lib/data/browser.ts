type Filter = {
  field: string;
  op: "eq" | "in";
  value: unknown;
};

type Order = {
  field: string;
  ascending: boolean;
};

type SingleMode = "none" | "single" | "maybeSingle";

type ReadPayload = {
  kind: "read";
  table: string;
  columns?: string;
  filters?: Filter[];
  orders?: Order[];
  singleMode?: SingleMode;
};

type WritePayload = {
  kind: "write";
  table: string;
  operation: "insert" | "update" | "upsert" | "delete";
  values?: unknown;
  filters?: Filter[];
  onConflict?: string;
  singleMode?: SingleMode;
};

type Payload = ReadPayload | WritePayload;

type QueryResult<T> = {
  data: T;
  error: { message: string } | null;
};

type AuthUser = {
  id: string;
  email: string | null;
};

type AuthResult = {
  user: AuthUser | null;
  error: { message: string } | null;
};

const AUTH_CACHE_TTL_MS = 15 * 1000;
let cachedAuthResult: (AuthResult & { fetchedAt: number }) | null = null;
let authRequestInFlight: Promise<AuthResult> | null = null;

function getFreshCachedAuthResult(): AuthResult | null {
  if (!cachedAuthResult) {
    return null;
  }

  if (Date.now() - cachedAuthResult.fetchedAt > AUTH_CACHE_TTL_MS) {
    cachedAuthResult = null;
    return null;
  }

  return {
    user: cachedAuthResult.user,
    error: cachedAuthResult.error,
  };
}

async function fetchAuthUser(): Promise<AuthResult> {
  try {
    const response = await fetch("/api/auth/me", {
      method: "GET",
      cache: "no-store",
    });
    const payload = (await response.json()) as { user: AuthUser | null };
    if (!response.ok) {
      return {
        user: null,
        error: { message: "Unable to fetch user" },
      };
    }

    return {
      user: payload.user,
      error: null,
    };
  } catch {
    return {
      user: null,
      error: { message: "Unable to fetch user" },
    };
  }
}

class QueryBuilder<T = unknown> implements PromiseLike<QueryResult<T>> {
  private readonly payload: Payload;

  constructor(payload: Payload) {
    this.payload = payload;
  }

  eq(field: string, value: unknown) {
    const filters = [...(this.payload.filters ?? []), { field, op: "eq" as const, value }];
    this.payload.filters = filters;
    return this;
  }

  in(field: string, value: unknown[]) {
    const filters = [...(this.payload.filters ?? []), { field, op: "in" as const, value }];
    this.payload.filters = filters;
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    const orders = [
      ...(this.payload.kind === "read" ? this.payload.orders ?? [] : []),
      { field, ascending: options?.ascending ?? true },
    ];
    if (this.payload.kind === "read") {
      this.payload.orders = orders;
    }
    return this;
  }

  select(columns: string) {
    if (this.payload.kind === "read") {
      this.payload.columns = columns;
    }
    return this;
  }

  single() {
    this.payload.singleMode = "single";
    return this.execute();
  }

  maybeSingle() {
    this.payload.singleMode = "maybeSingle";
    return this.execute();
  }

  async execute() {
    const response = await fetch("/api/data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(this.payload),
      cache: "no-store",
    });

    const payload = (await response.json()) as QueryResult<T>;
    if (!response.ok) {
      return {
        data: null as T,
        error: payload.error ?? { message: "Request failed" },
      };
    }
    return payload;
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled ?? undefined, onrejected ?? undefined);
  }
}

export function createBudgetBrowserClient() {
  return {
    auth: {
      async getUser() {
        const cached = getFreshCachedAuthResult();
        if (cached) {
          return {
            data: { user: cached.user },
            error: cached.error,
          };
        }

        if (!authRequestInFlight) {
          authRequestInFlight = fetchAuthUser().finally(() => {
            authRequestInFlight = null;
          });
        }

        const result = await authRequestInFlight;
        if (!result.error) {
          cachedAuthResult = {
            ...result,
            fetchedAt: Date.now(),
          };
        } else {
          cachedAuthResult = null;
        }

        return {
          data: { user: result.user },
          error: result.error,
        };
      },
    },

    from(table: string) {
      return {
        select(columns: string) {
          return new QueryBuilder({
            kind: "read",
            table,
            columns,
            filters: [],
            orders: [],
            singleMode: "none",
          });
        },

        insert(values: unknown) {
          return new QueryBuilder({
            kind: "write",
            table,
            operation: "insert",
            values,
            filters: [],
            singleMode: "none",
          });
        },

        update(values: unknown) {
          return new QueryBuilder({
            kind: "write",
            table,
            operation: "update",
            values,
            filters: [],
            singleMode: "none",
          });
        },

        upsert(values: unknown, options?: { onConflict?: string }) {
          return new QueryBuilder({
            kind: "write",
            table,
            operation: "upsert",
            values,
            onConflict: options?.onConflict,
            filters: [],
            singleMode: "none",
          });
        },

        delete() {
          return new QueryBuilder({
            kind: "write",
            table,
            operation: "delete",
            filters: [],
            singleMode: "none",
          });
        },
      };
    },
  };
}
