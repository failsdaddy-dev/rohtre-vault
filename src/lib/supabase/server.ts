import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "../database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

// Server Components can't set cookies; the proxy refreshes the session instead.
// connection(): session work runs only for a real request, never in a
// prerender or prefetch (token expiry checks use the current time, and
// signed-in data must never be cached ahead of the user).
// verified: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/connection.md
export async function supabaseServer() {
  await connection();
  const store = await cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          /* called from a Server Component: ignored, the proxy handles refresh */
        }
      },
    },
  });
}
