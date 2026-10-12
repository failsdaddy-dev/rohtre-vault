// UI-facing shapes. Mirrors the database (src/lib/database.types.ts) but never
// carries Mega URLs: link rows hold labels only.

export type SectionKind = "effect" | "music" | "sound" | "font" | "text";
export type LinkKind = "project" | "download";
/** "youtube" is the database name for video cards (a Cloudinary preview clip). */
export type MediaType = "youtube" | "audio";

/** A preview file on Cloudinary (public, unguessable name). The real file
 *  stays on Mega. */
export interface PreviewFile {
  url: string;
  public_id: string;
  version: number;
  format: string;
  bytes: number;
  duration: number;
}
export interface PreviewClip extends PreviewFile {
  width?: number;
  height?: number;
}
export interface AudioPreview extends PreviewFile {
  /** Waveform bar heights 0..1, made at upload. */
  peaks?: number[] | null;
}
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
  mediaType: MediaType;
  loomUrl: string | null;
  sourceUrl: string | null;
  hasProjectFiles: boolean;
  hasDownloads: boolean;
  /** Video cards: short silent clip on Cloudinary that loops on the card. */
  previewClip: PreviewClip | null;
  /** Audio cards: 30-second MP3 preview on Cloudinary. */
  audioPreview: AudioPreview | null;
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
