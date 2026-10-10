// The one place the UI gets data from: Supabase (data-source-supabase.ts) when
// configured, otherwise the sample data below. Both follow the same rules.

import { CARDS, FILTERS, FILTER_GROUPS, SECTIONS, mockLinkLabels } from "./mock-data";
import type { BrowsePage, BrowseQuery, Card, Cursor, Filter, FilterGroup, LinkLabel, Section } from "./types";

export const PAGE_SIZE = 24;

export interface DataSource {
  /** False for sample data: link buttons explain instead of opening anything. */
  linksConnected: boolean;
  sections(): Promise<Section[]>;
  filters(): Promise<{ groups: FilterGroup[]; filters: Filter[] }>;
  filterCounts(section: string): Promise<Record<string, number>>;
  browse(query: BrowseQuery, after?: Cursor | null): Promise<BrowsePage>;
  card(section: string, slug: string): Promise<Card | null>;
  linkLabels(cardId: string): Promise<LinkLabel[]>;
  /** Asks the server for a Mega link. Checks access and writes the audit log. */
  openLink(linkId: string): Promise<string>;
}

export class NotConnectedError extends Error {
  constructor() {
    super("Links are connected in Stage 6. This is sample data.");
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Same rules as public.browse_cards: OR inside a group, AND across groups. */
export function matchesFilters(card: Card, selected: readonly string[], filters: readonly Filter[]): boolean {
  if (!selected.length) return true;
  const bySlug = new Map(filters.map((f) => [f.slug, f]));
  const groups = new Map<string, Set<string>>();
  for (const slug of selected) {
    const f = bySlug.get(slug);
    if (!f) return false; // unknown or hidden filter: show nothing
    if (!groups.has(f.groupId)) groups.set(f.groupId, new Set());
    groups.get(f.groupId)!.add(slug);
  }
  for (const wanted of groups.values()) {
    if (!card.filterSlugs.some((s) => wanted.has(s))) return false;
  }
  return true;
}

function searchScore(card: Card, q: string, filters: readonly Filter[]): number {
  const words = q.toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, " ").split(/\s+/).filter(Boolean);
  if (!words.length) return 1;
  const names = card.filterSlugs.map((s) => filters.find((f) => f.slug === s)?.name ?? "").join(" ");
  const fields = [
    [card.title.toLowerCase(), 3],
    [names.toLowerCase(), 2],
    [card.description.toLowerCase(), 1],
  ] as const;
  let score = 0;
  for (const w of words) {
    let best = 0;
    for (const [text, weight] of fields) {
      if (text.split(/[^\p{L}\p{N}]+/u).some((t) => t.startsWith(w))) best = Math.max(best, weight);
    }
    if (!best) return 0; // every word must match (prefix), like the SQL version
    score += best;
  }
  return score;
}

export const mockSource: DataSource = {
  linksConnected: false,
  async sections() {
    return SECTIONS;
  },
  async filters() {
    return { groups: FILTER_GROUPS, filters: FILTERS };
  },
  async filterCounts(section) {
    const counts: Record<string, number> = {};
    for (const c of CARDS) {
      if (c.sectionSlug !== section) continue;
      for (const s of c.filterSlugs) counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  },
  async browse(query, after) {
    await wait(after ? 450 : 300);
    const scored = CARDS.filter((c) => c.sectionSlug === query.section && matchesFilters(c, query.filters, FILTERS))
      .map((c) => ({ c, score: query.q ? searchScore(c, query.q, FILTERS) : 0 }))
      .filter((x) => !query.q || x.score > 0);

    const sorted = scored.sort((a, b) => {
      if (query.sort === "relevance" && query.q) return b.score - a.score || b.c.id.localeCompare(a.c.id);
      if (query.sort === "manual") return a.c.title.localeCompare(b.c.title);
      return b.c.publishedAt.localeCompare(a.c.publishedAt) || b.c.id.localeCompare(a.c.id);
    });
    const startAt = after ? sorted.findIndex((x) => x.c.id === after.id) + 1 : 0;
    const slice = sorted.slice(startAt, startAt + PAGE_SIZE);
    const last = slice.at(-1);
    const hasMore = startAt + PAGE_SIZE < sorted.length;
    return {
      items: slice.map((x) => x.c),
      next: hasMore && last ? { ts: last.c.publishedAt, num: last.score, id: last.c.id } : null,
    };
  },
  async card(section, slug) {
    await wait(200);
    return CARDS.find((c) => c.sectionSlug === section && c.slug === slug) ?? null;
  },
  async linkLabels(cardId) {
    await wait(150);
    const card = CARDS.find((c) => c.id === cardId);
    return card ? mockLinkLabels(card) : [];
  },
  async openLink() {
    await wait(300);
    throw new NotConnectedError();
  },
};

let real: DataSource | null = null;

/** Supabase when .env.local is filled in, otherwise sample data. */
export function getDataSource(): DataSource {
  return real ?? mockSource;
}

/** Called once by the signed-in shell (client side) when Supabase is configured. */
export function setDataSource(source: DataSource) {
  real = source;
}
