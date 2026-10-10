"use client";

// Real data. Every read runs as the signed-in user, so RLS decides what comes
// back. Mega URLs are never selected: card_links.url isn't even granted.

import type { DataSource } from "./data-source";
import { supabaseBrowser } from "./supabase/client";
import type { Card } from "./types";

type CardRow = {
  id: string;
  section_slug: string;
  slug: string;
  title: string;
  description: string;
  youtube_id: string | null;
  preview_start: number;
  preview_end: number | null;
  loom_url: string | null;
  source_url: string | null;
  has_project_files: boolean;
  has_downloads: boolean;
  filter_slugs: string[];
  sort_ts: string;
};

function toCard(r: CardRow): Card {
  return {
    id: r.id,
    sectionSlug: r.section_slug,
    slug: r.slug,
    title: r.title,
    description: r.description,
    youtubeId: r.youtube_id,
    previewStart: r.preview_start,
    previewEnd: r.preview_end,
    loomUrl: r.loom_url,
    sourceUrl: r.source_url,
    hasProjectFiles: r.has_project_files,
    hasDownloads: r.has_downloads,
    filterSlugs: r.filter_slugs ?? [],
    publishedAt: r.sort_ts,
  };
}

let slugById: Map<string, string> | null = null;
async function filterSlugs(): Promise<Map<string, string>> {
  if (slugById) return slugById;
  const { data, error } = await supabaseBrowser().from("filters").select("id, slug");
  if (error) throw error;
  slugById = new Map((data ?? []).map((f) => [f.id, f.slug]));
  return slugById;
}

export const supabaseSource: DataSource = {
  linksConnected: true,

  async sections() {
    const { data, error } = await supabaseBrowser().from("sections").select("slug, name, kind").order("sort_order");
    if (error) throw error;
    return data ?? [];
  },

  async filters() {
    const sb = supabaseBrowser();
    const [g, f] = await Promise.all([
      sb.from("filter_groups").select("id, slug, name").order("sort_order"),
      sb.from("filters").select("id, group_id, slug, name, is_quick").order("sort_order"),
    ]);
    if (g.error) throw g.error;
    if (f.error) throw f.error;
    return {
      groups: g.data ?? [],
      filters: (f.data ?? []).map((x) => ({ id: x.id, groupId: x.group_id, slug: x.slug, name: x.name, isQuick: x.is_quick })),
    };
  },

  async filterCounts(section) {
    const [map, res] = await Promise.all([filterSlugs(), supabaseBrowser().rpc("filter_counts", { p_section: section })]);
    if (res.error) throw res.error;
    const out: Record<string, number> = {};
    for (const row of res.data ?? []) {
      const slug = map.get(row.filter_id);
      if (slug) out[slug] = Number(row.card_count);
    }
    return out;
  },

  async browse(query, after) {
    const { data, error } = await supabaseBrowser().rpc("browse_cards", {
      p_section: query.section,
      p_filters: query.filters,
      p_q: query.q || undefined,
      p_sort: query.sort,
      p_after_ts: after?.ts,
      p_after_num: after?.num,
      p_after_id: after?.id,
      p_limit: 24,
    });
    if (error) throw error;
    const rows = (data ?? []) as unknown as (CardRow & { sort_num: number })[];
    const last = rows.at(-1);
    return {
      items: rows.map(toCard),
      next: rows.length === 24 && last ? { ts: last.sort_ts, num: last.sort_num, id: last.id } : null,
    };
  },

  async card(section, slug) {
    const { data, error } = await supabaseBrowser()
      .from("cards")
      .select(
        "id, slug, title, description, youtube_id, preview_start, preview_end, loom_url, source_url, has_project_files, has_downloads, published_at, created_at, sections!inner(slug), card_filters(filters(slug))",
      )
      .eq("sections.slug", section)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const filters = (data.card_filters ?? [])
      .map((cf) => (cf.filters as { slug: string } | null)?.slug)
      .filter((s): s is string => !!s)
      .sort();
    return toCard({
      ...data,
      section_slug: section,
      filter_slugs: filters,
      sort_ts: data.published_at ?? data.created_at,
    });
  },

  async linkLabels(cardId) {
    const { data, error } = await supabaseBrowser()
      .from("card_links")
      .select("id, kind, label, sort_order")
      .eq("card_id", cardId)
      .order("kind")
      .order("sort_order");
    if (error) throw error;
    return (data ?? []).map((l) => ({ id: l.id, kind: l.kind, label: l.label }));
  },

  async openLink(linkId) {
    const { data, error } = await supabaseBrowser().functions.invoke<{ url?: string }>("get-asset-link", {
      body: { link_id: linkId },
    });
    if (error || !data?.url) throw error ?? new Error("No link");
    return data.url;
  },
};
