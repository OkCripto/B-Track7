import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type SupabaseServerClientOptions = {
  allowSetCookies?: boolean;
};

export async function createSupabaseServerClient(
  options: SupabaseServerClientOptions = {}
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  const cookieStore = await cookies();
  const allowSetCookies = options.allowSetCookies ?? true;

  return createServerClient(url, anonKey, {
    cookies: {
      async getAll() {
        return cookieStore.getAll();
      },
      async setAll(cookiesToSet) {
        if (!allowSetCookies) {
          return;
        }
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}
