import "server-only";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";
import type { CurrentUser } from "./types";

export interface Viewer {
  user: CurrentUser;
  isActive: boolean;
}

/** The signed-in user and their profile, or null. Uses getClaims (verified JWT). */
export async function getViewer(): Promise<Viewer | null> {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: p } = await sb
    .from("profiles")
    .select("id, email, display_name, role, is_active, expires_at")
    .eq("id", claims.sub)
    .maybeSingle();
  if (!p) return null;

  const expired = p.expires_at !== null && new Date(p.expires_at) <= new Date();
  return {
    user: { id: p.id, email: p.email, displayName: p.display_name || p.email, role: p.role },
    isActive: p.is_active && !expired,
  };
}

/** For every signed-in page: login and an active account. Editors keep the
 *  password the admin gave them; only the admin changes it. */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.isActive) redirect("/no-access");
  return viewer;
}

/** Admin pages. The database applies the same rule to every admin write. */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (viewer.user.role !== "admin") notFound();
  return viewer;
}
