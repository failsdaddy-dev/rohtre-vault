import "server-only";
// Loads what the signed-in shell needs. With Supabase, RLS decides which
// sections and filters this user may see; without it, sample data is used.

import { requireViewer } from "./auth";
import { FILTERS, FILTER_GROUPS, SECTIONS } from "./mock-data";
import { SUPABASE_CONFIGURED } from "./supabase/env";
import { supabaseServer } from "./supabase/server";
import type { CurrentUser, Filter, FilterGroup, Section } from "./types";

export interface HubData {
  sections: Section[];
  groups: FilterGroup[];
  filters: Filter[];
  user: CurrentUser;
  sampleMode: boolean;
}

const SAMPLE_USER: CurrentUser = {
  id: "sample-admin",
  email: "owner@example.com",
  displayName: "Sample Owner",
  role: "admin",
};

export async function loadHubData(): Promise<HubData> {
  if (!SUPABASE_CONFIGURED) {
    return { sections: SECTIONS, groups: FILTER_GROUPS, filters: FILTERS, user: SAMPLE_USER, sampleMode: true };
  }
  const viewer = await requireViewer();
  const sb = await supabaseServer();
  const [sections, groups, filters] = await Promise.all([
    sb.from("sections").select("slug, name, kind").eq("is_visible", true).order("sort_order").order("name"),
    sb.from("filter_groups").select("id, slug, name").order("sort_order").order("name"),
    sb.from("filters").select("id, group_id, slug, name, is_quick").order("sort_order").order("name"),
  ]);
  return {
    sections: sections.data ?? [],
    groups: groups.data ?? [],
    filters: (filters.data ?? []).map((f) => ({
      id: f.id,
      groupId: f.group_id,
      slug: f.slug,
      name: f.name,
      isQuick: f.is_quick,
    })),
    user: viewer.user,
    sampleMode: false,
  };
}

export async function findSection(slug: string): Promise<Section | null> {
  if (!SUPABASE_CONFIGURED) return SECTIONS.find((s) => s.slug === slug) ?? null;
  const sb = await supabaseServer();
  const { data } = await sb.from("sections").select("slug, name, kind").eq("slug", slug).maybeSingle();
  return data ?? null;
}
