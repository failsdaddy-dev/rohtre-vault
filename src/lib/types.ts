// UI-facing shapes. Mirrors the database (src/lib/database.types.ts) but never
// carries Mega URLs: link rows hold labels only.

export type SectionKind = "effect" | "music" | "sound" | "font" | "text";
export type LinkKind = "project" | "download";
export type SortMode = "newest" | "manual" | "relevance";

export interface Section {
  slug: string;
  name: string;
  kind: SectionKind;
}

export interface FilterGroup {
  id: string;
  slug: string;
  name: string;
}

export interface Filter {
  id: string;
  groupId: string;
  slug: string;
  name: string;
  isQuick: boolean;
}

export interface LinkLabel {
  id: string;
  kind: LinkKind;
  label: string;
}

export interface Card {
  id: string;
  sectionSlug: string;
  slug: string;
  title: string;
  description: string;
  youtubeId: string | null;
  previewStart: number;
  previewEnd: number | null;
  loomUrl: string | null;
  sourceUrl: string | null;
  hasProjectFiles: boolean;
  hasDownloads: boolean;
  filterSlugs: string[];
  publishedAt: string;
}

export interface BrowseQuery {
  section: string;
  filters: string[];
  q: string;
  sort: SortMode;
}

export interface Cursor {
  ts: string;
  num: number;
  id: string;
}

export interface BrowsePage {
  items: Card[];
  next: Cursor | null;
}

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "editor";
}
