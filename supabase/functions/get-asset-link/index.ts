// POST { link_id } -> { url }
// Checks the caller may see the card (same rules as RLS), writes the audit
// row, and only then returns the Mega link (R16). Refusals are audited too.
import { admin, corsHeaders, getCaller, isUuid, json, readJson } from "../_shared/common.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const caller = await getCaller(req);
  if (!caller) return json(req, { error: "not_signed_in" }, 401);

  const body = await readJson(req);
  if (!body || !isUuid(body.link_id)) return json(req, { error: "bad_request" }, 400);

  const { data: url, error } = await admin.rpc("release_asset_link", { p_user: caller.id, p_link: body.link_id });
  if (error) return json(req, { error: "server_error" }, 500);
  if (typeof url !== "string" || !url.startsWith("https://")) return json(req, { error: "no_access" }, 403);
  return json(req, { url });
});
