"use client";

// Makes a card preview clip from the admin's big source video, entirely in
// the browser (the source never leaves the computer): cut `length` seconds
// from `start`, drop the sound, fit it into 16:9 on a dark background (so
// transparent effects stay visible), and encode a small H.264 MP4 that
// stays under the 2 MB preview limit.
//
// Uses ffmpeg.wasm (single-thread build, so no special page headers are
// needed). Its files are served from /ffmpeg (copied from node_modules by
// scripts/copy-ffmpeg.mjs) and loaded only when the admin first makes a
// preview: about 32 MB once, then cached by the browser.
// Licences: @ffmpeg/ffmpeg 0.12.15 MIT, @ffmpeg/core 0.12.10 GPL-2.0-or-later
// (npm registry, checked 2026-10-12). Load options per @ffmpeg/ffmpeg's
// classes.js (classWorkerURL, coreURL, wasmURL).

import type { FFmpeg } from "@ffmpeg/ffmpeg";

export const PREVIEW_MAX_BYTES = 2 * 1024 * 1024;
export const SOURCE_MAX_BYTES = 1024 * 1024 * 1024; // browser memory limit, roughly

let loading: Promise<FFmpeg> | null = null;

/** Loads the video tool once per page. */
export function loadVideoTool(): Promise<FFmpeg> {
  if (loading) return loading;
  loading = (async () => {
    // Loaded from this site at runtime, not bundled: the library builds its
    // worker URL dynamically, which the bundler can't resolve.
    // verified: node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md (turbopackIgnore)
    const url = "/ffmpeg/esm/index.js";
    const { FFmpeg } = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url)) as typeof import("@ffmpeg/ffmpeg");
    const ff = new FFmpeg();
    await ff.load({
      // Absolute, so the library resolves it against this site.
      classWorkerURL: new URL("/ffmpeg/esm/worker.js", window.location.origin).href,
      coreURL: "/ffmpeg/core/ffmpeg-core.js",
      wasmURL: "/ffmpeg/core/ffmpeg-core.wasm",
    });
    return ff;
  })().catch((e) => {
    loading = null;
    throw e;
  });
  return loading;
}

const ext = (name: string) => (name.match(/\.([A-Za-z0-9]+)$/)?.[1] ?? "mp4").toLowerCase();

/** Puts the source into the tool's memory once; returns its length in seconds. */
export async function openSource(ff: FFmpeg, file: File): Promise<{ input: string; duration: number }> {
  const input = `source.${ext(file.name)}`;
  await ff.writeFile(input, new Uint8Array(await file.arrayBuffer()));
  let duration = 0;
  const onLog = ({ message }: { message: string }) => {
    const m = message.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (m) duration = +m[1] * 3600 + +m[2] * 60 + +m[3];
  };
  ff.on("log", onLog);
  try {
    await ff.exec(["-hide_banner", "-i", input]); // prints the header, then "no output" (expected)
  } finally {
    ff.off("log", onLog);
  }
  return { input, duration };
}

/** A still frame (JPEG) at `at` seconds, for sources the browser can't play (e.g. ProRes .mov). */
export async function stillFrame(ff: FFmpeg, input: string, at: number): Promise<Blob> {
  await ff.exec(["-hide_banner", "-ss", String(at), "-i", input, "-frames:v", "1", "-vf", "scale=480:-2", "-y", "frame.jpg"]);
  const data = (await ff.readFile("frame.jpg")) as Uint8Array;
  return new Blob([data.slice()], { type: "image/jpeg" });
}

const ATTEMPTS = [
  { w: 854, h: 480, crf: 28 },
  { w: 854, h: 480, crf: 33 },
  { w: 640, h: 360, crf: 34 },
];

/** Encodes the preview; tries smaller settings until it fits under 2 MB. */
export async function makePreview(
  ff: FFmpeg,
  input: string,
  start: number,
  length: number,
  onProgress: (fraction: number) => void,
): Promise<File> {
  const onProg = ({ progress }: { progress: number }) => onProgress(Math.max(0, Math.min(1, progress)));
  ff.on("progress", onProg);
  try {
    for (const [i, a] of ATTEMPTS.entries()) {
      const filter =
        `[0:v]fps=30,scale=${a.w}:${a.h}:force_original_aspect_ratio=decrease,format=yuva420p[fg];` +
        `color=c=0x111111:s=${a.w}x${a.h}:r=30[bg];` +
        `[bg][fg]overlay=(W-w)/2:(H-h)/2:shortest=1,format=yuv420p[out]`;
      const code = await ff.exec([
        "-hide_banner",
        "-ss", String(start),
        "-t", String(length),
        "-i", input,
        "-filter_complex", filter,
        "-map", "[out]",
        "-an",
        "-t", String(length),
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", String(a.crf),
        "-movflags", "+faststart",
        "-y", "preview.mp4",
      ]);
      if (code !== 0) throw new Error("The video tool couldn’t read that file. Try exporting it as MP4 or MOV.");
      const data = (await ff.readFile("preview.mp4")) as Uint8Array;
      if (data.byteLength <= PREVIEW_MAX_BYTES * 0.97 || i === ATTEMPTS.length - 1) {
        if (data.byteLength > PREVIEW_MAX_BYTES) throw new Error("Even the smallest preview is over 2 MB. Pick a shorter part.");
        return new File([data.slice()], "preview.mp4", { type: "video/mp4" });
      }
    }
    throw new Error("Couldn’t make the preview.");
  } finally {
    ff.off("progress", onProg);
  }
}

// ------------------------------------------------------------ audio preview
// Music previews: any size / format in (MP3, WAV, M4A/AAC, FLAC, OGG), a
// 30-second MP3 out (128 kbps stereo, about 0.5 MB, under the 1 MB limit),
// with an optional soft fade in and out. Same tool, same rule: the full
// track never leaves this computer.

export const AUDIO_PREVIEW_SECONDS = 30;
export const AUDIO_PREVIEW_MAX_BYTES = 1024 * 1024;
export const AUDIO_SOURCE_MAX_BYTES = 300 * 1024 * 1024;

/** Waveform bar heights (0..1) for the whole track, decoded by the tool at
 *  low resolution so even long WAV files don't overload the page. */
export async function audioPeaks(ff: FFmpeg, input: string, bars = 240): Promise<number[]> {
  await ff.exec(["-hide_banner", "-i", input, "-vn", "-ac", "1", "-ar", "4000", "-f", "s16le", "-acodec", "pcm_s16le", "-y", "peaks.raw"]);
  const raw = (await ff.readFile("peaks.raw")) as Uint8Array;
  void ff.deleteFile("peaks.raw").catch(() => {});
  const samples = new Int16Array(raw.buffer, raw.byteOffset, Math.floor(raw.byteLength / 2));
  if (!samples.length) return [];
  const step = Math.max(1, Math.floor(samples.length / bars));
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    let m = 0;
    for (let k = i * step; k < Math.min(samples.length, (i + 1) * step); k++) m = Math.max(m, Math.abs(samples[k]));
    out.push(m);
  }
  const top = Math.max(...out, 1);
  return out.map((v) => Math.round((v / top) * 100) / 100);
}

/** Cuts the preview and encodes it as MP3; drops to 96 kbps if 128 is too big. */
export async function makeAudioPreview(
  ff: FFmpeg,
  input: string,
  start: number,
  length: number,
  fade: boolean,
  onProgress: (fraction: number) => void,
): Promise<File> {
  const onProg = ({ progress }: { progress: number }) => onProgress(Math.max(0, Math.min(1, progress)));
  ff.on("progress", onProg);
  try {
    const len = Math.max(0.5, length);
    const filters = fade && len > 2 ? ["-af", `afade=t=in:st=0:d=0.5,afade=t=out:st=${(len - 0.5).toFixed(2)}:d=0.5`] : [];
    for (const kbps of [128, 96]) {
      const code = await ff.exec([
        "-hide_banner",
        "-ss", String(start),
        "-t", String(len),
        "-i", input,
        "-vn",
        "-ac", "2",
        "-ar", "44100",
        ...filters,
        "-c:a", "libmp3lame",
        "-b:a", `${kbps}k`,
        "-y", "preview.mp3",
      ]);
      if (code !== 0) throw new Error("The tool couldn’t read that audio file. Try MP3, WAV, M4A or FLAC.");
      const data = (await ff.readFile("preview.mp3")) as Uint8Array;
      if (data.byteLength <= AUDIO_PREVIEW_MAX_BYTES * 0.97) {
        return new File([data.slice()], "preview.mp3", { type: "audio/mpeg" });
      }
    }
    throw new Error("The preview came out over 1 MB. Try again with a shorter part.");
  } finally {
    ff.off("progress", onProg);
  }
}
