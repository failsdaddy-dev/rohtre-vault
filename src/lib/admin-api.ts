"use client";

// Admin data access. Everything runs as the signed-in admin; the database
// refuses all of it unless the session is an active admin.

import { supabaseBrowser } from "./supabase/client";
import type { Database, Json } from "./database.types";

type Tables = Database["public"]["Tables"];
export type CardRow = Tables["cards"]["Row"];
export type SectionRow = Tables["sections"]["Row"];
export type GroupRow = Tables["filter_groups"]["Row"];
export type FilterRow = Tables["filters"]["Row"];
export type ProfileRow = Tables["profiles"]["Row"];
export type AuditRow = Tables["audit_log"]["Row"];
export type LinkKind = Database["public"]["Enums"]["link_kind"];

export interface EditableLink {
  kind: LinkKind;
  label: string;
  url: string;
}

const sb = () => supabaseBrowser();

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function loadTaxonomy() {
  const [sections, groups, filters] = await Promise.all([
    sb().from("sections").select("*").order("sort_order").order("name"),
    sb().from("filter_groups").select("*").order("sort_order").order("name"),
    sb().from("filters").select("*").order("sort_order").order("name"),
  ]);
  return { sections: check(sections) ?? [], groups: check(groups) ?? [], filters: check(filters) ?? [] };
}

export async function listCards() {
  const res = await sb()
    .from("cards")
    .select("*, card_filters(filter_id)")
    .order("sort_order")
    .order("created_at", { ascending: false });
  return (check(res) ?? []).map((c) => ({ ...c, filter_ids: (c.card_filters ?? []).map((x) => x.filter_id) }));
}
export type CardWithFilters = Awaited<ReturnType<typeof listCards>>[number];

export async function getCard(id: string) {
  const res = await sb().from("cards").select("*, card_filters(filter_id)").eq("id", id).maybeSingle();
  const c = check(res);
  return c ? { ...c, filter_ids: (c.card_filters ?? []).map((x) => x.filter_id) } : null;
}

export async function getCardLinks(cardId: string): Promise<EditableLink[]> {
  const rows = check(await sb().rpc("admin_card_links", { p_card: cardId })) ?? [];
  return rows.map((r) => ({ kind: r.kind, label: r.label, url: r.url }));
}

export type CardInput = Pick<
  CardRow,
  | "section_id"
  | "slug"
  | "title"
  | "description"
  | "media_type"
  | "preview_clip"
  | "audio_preview"
  | "loom_url"
  | "source_url"
  | "status"
>;

/** The card was changed by someone else since it was loaded (updated_at moved). */
export class CardConflictError extends Error {
  constructor() {
    super("Someone else changed this card since you opened it.");
  }
}

/**
 * Creates or updates a card. With `expectedUpdatedAt`, the update only
 * applies if the card is unchanged since it was loaded (the database's
 * touch trigger moves updated_at on every write); otherwise it throws
 * CardConflictError and nothing is written.
 */
export async function saveCard(
  id: string | null,
  input: CardInput,
  filterIds: string[],
  links: EditableLink[],
  expectedUpdatedAt?: string,
) {
  let cardId = id;
  if (cardId) {
    let q = sb().from("cards").update(input).eq("id", cardId);
    if (expectedUpdatedAt) q = q.eq("updated_at", expectedUpdatedAt);
    const rows = check(await q.select("id")) ?? [];
    if (!rows.length) {
      // Nothing updated: either the card moved on, or RLS refused the write.
      const now = check(await sb().from("cards").select("updated_at").eq("id", cardId).maybeSingle());
      if (expectedUpdatedAt && now && now.updated_at !== expectedUpdatedAt) throw new CardConflictError();
      throw new Error(now ? "You don’t have permission to edit this card." : "This card no longer exists.");
    }
  } else {
    const row = check(await sb().from("cards").insert(input).select("id").single());
    if (!row) throw new Error("The card wasn't created.");
    cardId = row.id;
  }
  check(await sb().rpc("admin_set_card_filters", { p_card: cardId!, p_filters: filterIds }));
  check(await sb().rpc("admin_save_card_links", { p_card: cardId!, p_links: links as unknown as Json }));
  return cardId!;
}

export async function setCardFilters(cardId: string, filterIds: string[]) {
  check(await sb().rpc("admin_set_card_filters", { p_card: cardId, p_filters: filterIds }));
}

export async function deleteCard(id: string) {
  // Remember the card's preview files first, so they leave Cloudinary too.
  const { data } = await sb().from("cards").select("preview_clip, audio_preview").eq("id", id).maybeSingle();
  check(await sb().from("cards").delete().eq("id", id));
  for (const f of [data?.preview_clip, data?.audio_preview]) {
    const pid = (f as { public_id?: string } | null)?.public_id;
    if (pid) await deletePreviewFile(pid).catch(() => {});
  }
}

// ---------------------------------------------------------- preview files
// Cloudinary holds only short previews (the real files stay on Mega). The
// admin's browser uploads them directly with a signature from the admin-only
// cloudinary-sign-upload function; the card stores the file's details.

export type PreviewKind = "video" | "audio";

export interface UploadTicket {
  upload_url: string;
  api_key: string;
  signature: string;
  max_mb: number;
  max_seconds: number;
  params: Record<string, string | number>;
}

export async function signPreviewUpload(kind: PreviewKind): Promise<UploadTicket> {
  const { data, error } = await sb().functions.invoke<UploadTicket & { error?: string }>("cloudinary-sign-upload", { body: { kind } });
  if (error || !data?.signature) throw new Error(data?.error ?? "Couldn’t start the upload. Is Cloudinary set up (see docs/cloudinary-setup.md)?");
  return data;
}

/** Removes a preview from Cloudinary. The server refuses files a card still uses. */
export async function deletePreviewFile(publicId: string): Promise<void> {
  const { error } = await sb().functions.invoke("cloudinary-delete-preview", { body: { public_id: publicId } });
  if (error) throw error;
}

export async function setCardStatus(id: string, status: CardRow["status"]) {
  check(await sb().from("cards").update({ status }).eq("id", id));
}

export async function reorder(kind: "cards" | "sections" | "filter_groups" | "filters", ids: string[]) {
  check(await sb().rpc("admin_reorder", { p_kind: kind, p_ids: ids }));
}

export async function linkOpenCounts() {
  const rows = check(await sb().rpc("admin_link_open_counts")) ?? [];
  return new Map(rows.map((r) => [r.card_id, Number(r.opens)]));
}

// ---------------------------------------------------------------- filters
export async function createGroup(name: string, slug: string) {
  check(await sb().from("filter_groups").insert({ name, slug }));
}
export async function updateGroup(id: string, patch: Partial<GroupRow>) {
  check(await sb().from("filter_groups").update(patch).eq("id", id));
}
export async function deleteGroup(id: string) {
  check(await sb().from("filter_groups").delete().eq("id", id));
}
export async function createFilter(groupId: string, name: string, slug: string) {
  check(await sb().from("filters").insert({ group_id: groupId, name, slug }));
}
export async function updateFilter(id: string, patch: Partial<FilterRow>) {
  check(await sb().from("filters").update(patch).eq("id", id));
}
export async function deleteFilter(id: string) {
  check(await sb().from("filters").delete().eq("id", id));
}
export async function mergeFilters(fromId: string, intoId: string) {
  check(await sb().rpc("admin_merge_filters", { p_from: fromId, p_into: intoId }));
}

// --------------------------------------------------------------- sections
export async function createSection(input: Pick<SectionRow, "name" | "slug" | "kind">) {
  check(await sb().from("sections").insert(input));
}
export async function updateSection(id: string, patch: Partial<SectionRow>) {
  check(await sb().from("sections").update(patch).eq("id", id));
}
export async function deleteSection(id: string) {
  check(await sb().from("sections").delete().eq("id", id));
}

// ------------------------------------------------------------------ users
export async function listUsers() {
  const [profiles, access] = await Promise.all([
    sb().from("profiles").select("*").order("created_at", { ascending: false }),
    sb().from("user_filter_access").select("user_id, filter_id"),
  ]);
  const byUser = new Map<string, string[]>();
  for (const a of check(access) ?? []) byUser.set(a.user_id, [...(byUser.get(a.user_id) ?? []), a.filter_id]);
  return (check(profiles) ?? []).map((p) => ({ ...p, filter_ids: byUser.get(p.id) ?? [] }));
}
export type UserWithAccess = Awaited<ReturnType<typeof listUsers>>[number];

async function invoke(fn: "admin-create-user" | "admin-manage-user", body: Record<string, unknown>) {
  const { data, error } = await sb().functions.invoke<{ error?: string; id?: string; ok?: boolean }>(fn, { body });
  if (error) {
    // The function's own message (e.g. "A user with this email already exists.")
    let message = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) message = ((await ctx.json()) as { error?: string }).error ?? message;
    } catch {
      /* keep the generic message */
    }
    throw new Error(message);
  }
  return data;
}

export const createUser = (body: {
  email: string;
  password: string;
  display_name: string;
  all_access: boolean;
  filter_ids: string[];
  expires_at: string | null;
}) => invoke("admin-create-user", body);

export const manageUser = (
  action: "disable" | "enable" | "delete" | "set_access" | "update" | "reset_password",
  userId: string,
  extra: Record<string, unknown> = {},
) => invoke("admin-manage-user", { action, user_id: userId, ...extra });

// ------------------------------------------------------------------ audit
export async function listAudit(action: string | null, limit = 200) {
  let q = sb().from("audit_log").select("*").order("created_at", { ascending: false }).limit(limit);
  if (action) q = q.eq("action", action);
  return check(await q) ?? [];
}

/** "Cartoon question mark" -> "cartoon-question-mark" */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}
