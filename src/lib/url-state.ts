// URL <-> browse state. Format agreed in Phase 0 (Q14):
//   /effects?f=cartoon,fc-27&q=question&sort=manual
// Filter slugs are de-duplicated and sorted so the same selection always
// produces the same shareable link.

import type { SortMode } from "./types";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SORTS: readonly SortMode[] = ["newest", "manual", "relevance"];
export const MAX_QUERY = 200;

export interface UrlState {
  filters: string[];
  q: string;
  sort: SortMode;
}

type ParamsLike = { get(name: string): string | null };

export function parseUrlState(params: ParamsLike): UrlState {
  const filters = normalizeFilters((params.get("f") ?? "").split(","));
  const q = (params.get("q") ?? "").trim().slice(0, MAX_QUERY);
  const rawSort = params.get("sort") as SortMode | null;
  const sort: SortMode = rawSort && SORTS.includes(rawSort) ? rawSort : q ? "relevance" : "newest";
  return { filters, q, sort };
}

export function normalizeFilters(slugs: readonly string[]): string[] {
  const clean = slugs.map((s) => s.trim().toLowerCase()).filter((s) => SLUG.test(s));
  return Array.from(new Set(clean)).sort();
}

export function buildQueryString(state: Partial<UrlState>): string {
  const params = new URLSearchParams();
  const filters = normalizeFilters(state.filters ?? []);
  if (filters.length) params.set("f", filters.join(","));
  const q = (state.q ?? "").trim().slice(0, MAX_QUERY);
  if (q) params.set("q", q);
  const defaultSort: SortMode = q ? "relevance" : "newest";
  if (state.sort && state.sort !== defaultSort) params.set("sort", state.sort);
  // Keep commas readable in shared links.
  const qs = params.toString().replace(/%2C/gi, ",");
  return qs ? `?${qs}` : "";
}

export function buildHref(section: string, state: Partial<UrlState>): string {
  return `/${section}${buildQueryString(state)}`;
}

export function toggleFilter(filters: readonly string[], slug: string): string[] {
  return filters.includes(slug) ? filters.filter((f) => f !== slug) : [...filters, slug];
}
