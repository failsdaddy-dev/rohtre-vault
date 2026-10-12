// Delivery URLs for preview files on Cloudinary. The stored URL is the
// original upload; cards ask Cloudinary for a smaller version by adding a
// transformation after "/upload/" (public files can be transformed on the
// fly; each variant is made once, then cached).
// verified: https://cloudinary.com/documentation/video_manipulation_and_delivery
// verified: https://cloudinary.com/documentation/audio_transformations

import type { AudioPreview, PreviewClip } from "./types";

const UPLOAD = "/video/upload/";

/** Inserts `transformation` after /upload/ and optionally swaps the extension. */
export function cloudinaryVariant(url: string, transformation: string, ext?: string): string {
  const i = url.indexOf(UPLOAD);
  if (i < 0) return url;
  const head = url.slice(0, i + UPLOAD.length);
  let rest = url.slice(i + UPLOAD.length);
  if (ext) rest = rest.replace(/\.[A-Za-z0-9]+$/, `.${ext}`);
  return `${head}${transformation}/${rest}`;
}

/** Card loop: at most 480 px wide, automatic quality, MP4, no sound track. */
export const clipLoopUrl = (url: string) => cloudinaryVariant(url, "c_limit,w_480,q_auto,ac_none", "mp4");
/** Bigger loop for the card's modal and page. */
export const clipLargeUrl = (url: string) => cloudinaryVariant(url, "c_limit,w_1280,q_auto,ac_none", "mp4");
/** Still frame from the start of the clip, used as the card's thumbnail. */
export const clipPosterUrl = (url: string) => cloudinaryVariant(url, "so_0,c_limit,w_480,q_auto", "jpg");

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function base(v: unknown) {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.url !== "string" || !o.url.startsWith("https://res.cloudinary.com/")) return null;
  return {
    url: o.url,
    public_id: String(o.public_id ?? ""),
    version: num(o.version) ?? 0,
    format: String(o.format ?? ""),
    bytes: num(o.bytes) ?? 0,
    duration: num(o.duration) ?? 0,
    o,
  };
}

export function parsePreviewClip(v: unknown): PreviewClip | null {
  const b = base(v);
  if (!b) return null;
  const { o, ...rest } = b;
  return { ...rest, width: num(o.width) ?? undefined, height: num(o.height) ?? undefined };
}

export function parseAudioPreview(v: unknown): AudioPreview | null {
  const b = base(v);
  if (!b) return null;
  const { o, ...rest } = b;
  const peaks = Array.isArray(o.peaks) ? o.peaks.map(Number).filter((n) => Number.isFinite(n)) : null;
  return { ...rest, peaks };
}
