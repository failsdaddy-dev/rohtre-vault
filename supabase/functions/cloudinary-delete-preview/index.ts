// POST { public_id }  Admin only (active admin).
// Deletes a preview file from Cloudinary after a card is deleted, its preview
// is replaced or removed, or an upload is cancelled / its save failed.
// Refuses anything outside the preview folders and any file a card still uses.
// verified: https://cloudinary.com/documentation/image_upload_api_reference_destroy_by_public_id
import { apiSignature, cloudinaryEnv, isPreviewPublicId } from "../_shared/cloudinary.ts";
import { admin, audit, corsHeaders, getCaller, isAdmin, json, readJson } from "../_shared/common.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const caller = await getCaller(req);
  if (!caller) return json(req, { error: "not_signed_in" }, 401);
  if (!(await isAdmin(caller))) return json(req, { error: "admin_only" }, 403);

  const env = cloudinaryEnv();
  if (!env) return json(req, { error: "cloudinary_not_configured" }, 500);

  const b = await readJson(req);
  const publicId = b?.public_id;
  if (!isPreviewPublicId(publicId)) return json(req, { error: "bad_request" }, 400);

  const { count } = await admin
    .from("cards")
    .select("id", { count: "exact", head: true })
    .or(`preview_clip->>public_id.eq."${publicId}",audio_preview->>public_id.eq."${publicId}"`);
  if (count) return json(req, { error: "in_use" }, 409);

  const timestamp = Math.floor(Date.now() / 1000);
  const params = { invalidate: "true", public_id: publicId, timestamp };
  const signature = await apiSignature(params, env.secret);
  const body = new URLSearchParams({ invalidate: "true", public_id: publicId, timestamp: String(timestamp), api_key: env.apiKey, signature });
  const res = await fetch(`https://api.cloudinary.com/v1_1/${env.cloud}/video/destroy`, { method: "POST", body });
  const out = (await res.json().catch(() => ({}))) as { result?: string };
  if (!res.ok || (out.result !== "ok" && out.result !== "not found")) {
    return json(req, { error: "cloudinary_error", result: out.result ?? res.status }, 502);
  }
  await audit(caller, "preview_deleted", { public_id: publicId, result: out.result });
  return json(req, { ok: true, result: out.result });
});
