import "server-only";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";
import type { CurrentUser } from "./types";

export interface Viewer {
  user: CurrentUser;
  aal: "aal1" | "aal2";
  isActive: boolean;
  mustChangePassword: boolean;
}

/** The signed-in user and their profile, or null. Uses getClaims (verified JWT). */
export async function getViewer(): Promise<Viewer | null> {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: p } = await sb
    .from("profiles")
    .select("id, email, display_name, role, is_active, expires_at, must_change_password")
    .eq("id", claims.sub)
    .maybeSingle();
  if (!p) return null;

  const expired = p.expires_at !== null && new Date(p.expires_at) <= new Date();
  return {
    user: { id: p.id, email: p.email, displayName: p.display_name || p.email, role: p.role },
    aal: claims.aal === "aal2" ? "aal2" : "aal1",
    isActive: p.is_active && !expired,
    mustChangePassword: p.must_change_password,
  };
}

/** For every signed-in page: login, active account, password already changed. */
export async function requireViewer(opts: { allowPasswordChange?: boolean } = {}): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.isActive) redirect("/no-access");
  if (viewer.mustChangePassword && !opts.allowPasswordChange) redirect("/account/password");
  return viewer;
}

/** Admin pages. Without a 2FA-verified session the admin is sent to set it up. */
export async function requireAdmin(opts: { allowAal1?: boolean } = {}): Promise<Viewer> {
  const viewer = await requireViewer();
  if (viewer.user.role !== "admin") notFound();
  if (viewer.aal !== "aal2" && !opts.allowAal1) redirect("/admin/security");
  return viewer;
}
