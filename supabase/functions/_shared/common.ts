// Shared helpers for RohTre Vault Edge Functions (Deno).
// The secret key comes from the Supabase runtime and never leaves the server.
// verified: https://supabase.com/docs/guides/api/api-keys (SUPABASE_SECRET_KEYS)
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

function secretKey(): string {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const keys = JSON.parse(raw) as Record<string, string>;
      const key = keys["default"] ?? Object.values(keys)[0];
      if (key) return key;
    } catch {
      /* fall through */
    }
  }
  // Local CLI fallback names.
  return Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

export const admin = createClient(Deno.env.get("SUPABASE_URL")!, secretKey(), {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Browsers may only call these functions from the app's own origins.
// Set ALLOWED_ORIGINS (comma separated) as a function secret before launch.
const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "http://localhost:3000,http://127.0.0.1:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED.includes(origin) ? origin : ALLOWED[0] ?? "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export interface Caller {
  id: string;
  email: string;
  aal: string;
}

/** Verifies the caller's access token (signature + expiry) and returns who they are. */
export async function getCaller(req: Request): Promise<Caller | null> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin.auth.getClaims(token);
  const claims = data?.claims;
  if (error || !claims?.sub || claims.role !== "authenticated") return null;
  return { id: claims.sub, email: String(claims.email ?? ""), aal: String(claims.aal ?? "aal1") };
}

/** Active admin profile and a 2FA-verified session, same rule as private.is_admin(). */
export async function isAdmin(caller: Caller): Promise<boolean> {
  if (caller.aal !== "aal2") return false;
  const { data } = await admin
    .from("profiles")
    .select("role, is_active, expires_at")
    .eq("id", caller.id)
    .maybeSingle();
  if (!data || data.role !== "admin" || !data.is_active) return false;
  return !data.expires_at || new Date(data.expires_at) > new Date();
}

export async function audit(caller: Caller, action: string, details: Record<string, unknown>) {
  await admin.from("audit_log").insert({ actor_id: caller.id, actor_email: caller.email, action, details });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}
