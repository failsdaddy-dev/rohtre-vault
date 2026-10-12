// POST { action, user_id, ... }  Admin only (active admin).
//   disable          -> profile off + login banned: locked out at once
//   enable           -> undo disable
//   delete           -> removes the login and profile
//   set_access       -> { all_access, filter_ids[] }
//   update           -> { display_name?, expires_at? (ISO or null) }
//   reset_password   -> { password } (the editor signs in with it)
import { admin, audit, corsHeaders, getCaller, isAdmin, isUuid, json, readJson } from "../_shared/common.ts";

const FOREVER = "876000h"; // ~100 years

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const caller = await getCaller(req);
  if (!caller) return json(req, { error: "not_signed_in" }, 401);
  if (!(await isAdmin(caller))) return json(req, { error: "admin_only" }, 403);

  const b = await readJson(req);
  const action = typeof b?.action === "string" ? b.action : "";
  const userId = b?.user_id;
  if (!isUuid(userId)) return json(req, { error: "bad_request" }, 400);
  if (userId === caller.id && ["disable", "delete", "set_access"].includes(action)) {
    return json(req, { error: "You can't do that to your own account." }, 400);
  }

  const { data: target } = await admin.from("profiles").select("id, email, role").eq("id", userId).maybeSingle();
  if (!target) return json(req, { error: "User not found." }, 404);

  switch (action) {
    case "disable": {
      await admin.from("profiles").update({ is_active: false }).eq("id", userId);
      await admin.auth.admin.updateUserById(userId, { ban_duration: FOREVER });
      break;
    }
    case "enable": {
      await admin.from("profiles").update({ is_active: true }).eq("id", userId);
      await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
      break;
    }
    case "delete": {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json(req, { error: "Couldn't delete the user." }, 500);
      break;
    }
    case "set_access": {
      const allAccess = b?.all_access === true;
      const filterIds = Array.isArray(b?.filter_ids) ? b.filter_ids.filter(isUuid) : [];
      await admin.from("profiles").update({ all_access: allAccess }).eq("id", userId);
      await admin.from("user_filter_access").delete().eq("user_id", userId);
      if (!allAccess && filterIds.length) {
        await admin.from("user_filter_access").insert(filterIds.map((filter_id: string) => ({ user_id: userId, filter_id })));
      }
      break;
    }
    case "update": {
      const patch: Record<string, unknown> = {};
      if (typeof b?.display_name === "string") patch.display_name = b.display_name.trim().slice(0, 80);
      if (b?.expires_at === null || b?.expires_at === "") patch.expires_at = null;
      else if (typeof b?.expires_at === "string") {
        const d = new Date(b.expires_at);
        if (Number.isNaN(d.getTime())) return json(req, { error: "The expiry date isn't valid." }, 400);
        patch.expires_at = d.toISOString();
      }
      if (Object.keys(patch).length) await admin.from("profiles").update(patch).eq("id", userId);
      break;
    }
    case "reset_password": {
      const password = typeof b?.password === "string" ? b.password : "";
      if (password.length < 10) return json(req, { error: "The password needs at least 10 characters." }, 400);
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return json(req, { error: "Couldn't reset the password." }, 500);
      break;
    }
    default:
      return json(req, { error: "Unknown action." }, 400);
  }

  await audit(caller, `admin_${action}`, { user_id: userId, email: target.email });
  return json(req, { ok: true });
});
