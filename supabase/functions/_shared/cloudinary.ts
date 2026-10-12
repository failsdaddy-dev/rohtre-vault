// Cloudinary settings for the Edge Functions. All three values are Supabase
// function secrets; the API secret never reaches the browser.
// Cloudinary holds PREVIEWS only (the real files stay on Mega):
//   video  -> silent card clip, MP4/WebM/MOV, up to 10 s and 2 MB
//   audio  -> music preview, MP3, up to 30 s and 1 MB
// Both use Cloudinary's "video" resource type (audio is stored as video).
// verified: https://cloudinary.com/documentation/audio_transformations
export * from "./cloudinary-sign.ts";

export const PREVIEW_KINDS = {
  video: { folder: "rohtre-vault/previews", formats: "mp4,webm,mov", maxMb: 2, maxSeconds: 10 },
  audio: { folder: "rohtre-vault/music", formats: "mp3", maxMb: 1, maxSeconds: 30 },
} as const;
export type PreviewKind = keyof typeof PREVIEW_KINDS;

export function cloudinaryEnv(): { cloud: string; apiKey: string; secret: string } | null {
  const cloud = Deno.env.get("CLOUDINARY_CLOUD_NAME") ?? "";
  const apiKey = Deno.env.get("CLOUDINARY_API_KEY") ?? "";
  const secret = Deno.env.get("CLOUDINARY_API_SECRET") ?? "";
  return cloud && apiKey && secret ? { cloud, apiKey, secret } : null;
}

export const isPreviewPublicId = (v: unknown): v is string =>
  typeof v === "string" &&
  Object.values(PREVIEW_KINDS).some((k) => v.startsWith(`${k.folder}/`)) &&
  /^[A-Za-z0-9_./-]+$/.test(v) &&
  !v.includes("..");
