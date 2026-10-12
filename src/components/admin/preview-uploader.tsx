"use client";

// Upload field for preview files on Cloudinary (the real files stay on Mega):
//   video -> silent card clip, MP4 / WebM / MOV, up to 10 s and 2 MB
//   audio -> music preview, MP3, up to 30 s and 1 MB
// The browser checks type, size and length first (and, for audio, reads the
// waveform), then uploads straight to Cloudinary with a signature from the
// admin-only cloudinary-sign-upload function. Nothing passes through our servers.

import { useEffect, useRef, useState } from "react";
import { signPreviewUpload, type PreviewKind, type UploadTicket } from "@/lib/admin-api";
import { clipLoopUrl } from "@/lib/cloudinary-url";
import type { AudioPreview, PreviewClip } from "@/lib/types";
import { formatTime, useAudio } from "../audio-player";
import { CloseIcon, MusicIcon, PlayIcon, UploadIcon } from "../icons";
import { Waveform } from "../waveform";
import { AUDIO_SOURCE_MAX_BYTES, SOURCE_MAX_BYTES } from "@/lib/make-preview";
import { AudioPreviewMaker } from "./audio-preview-maker";
import { PreviewMaker } from "./preview-maker";
import { Button } from "./ui";

export const PREVIEW_LIMITS = {
  video: { mb: 2, seconds: 10, accept: "video/*,.mp4,.m4v,.mov,.webm,.mkv", label: "MP4, WebM or MOV", re: /\.(mp4|webm|mov)$/i, mime: /^video\/(mp4|webm|quicktime)$/ },
  audio: { mb: 1, seconds: 30, accept: "audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg,.opus,.aif,.aiff", label: "MP3", re: /\.mp3$/i, mime: /^audio\/(mpeg|mp3)$/ },
} as const;

const PEAKS = 120;

/** What the form holds; `saved` = already on the card. */
export type PreviewValue = ((PreviewClip & AudioPreview) & { saved: boolean; localUrl?: string }) | null;

async function readAudio(file: File): Promise<{ duration: number; peaks: number[] }> {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const buf = await ctx.decodeAudioData(await file.arrayBuffer());
    const data = buf.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / PEAKS));
    const raw: number[] = [];
    for (let i = 0; i < PEAKS; i++) {
      let m = 0;
      for (let k = i * step; k < Math.min(data.length, (i + 1) * step); k += 16) m = Math.max(m, Math.abs(data[k]));
      raw.push(m);
    }
    const top = Math.max(...raw, 0.0001);
    return { duration: buf.duration, peaks: raw.map((v) => Math.round((v / top) * 100) / 100) };
  } finally {
    void ctx.close();
  }
}

function readVideo(file: File): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(file);
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      resolve({ duration: v.duration, width: v.videoWidth, height: v.videoHeight });
      URL.revokeObjectURL(url);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This browser can’t read that video. Export it as MP4 (H.264)."));
    };
    v.src = url;
  });
}

function upload(file: File, ticket: UploadTicket, onProgress: (f: number) => void, xhrRef: { current: XMLHttpRequest | null }) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", ticket.api_key);
    form.append("signature", ticket.signature);
    for (const [k, v] of Object.entries(ticket.params)) form.append(k, String(v));
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", ticket.upload_url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      xhrRef.current = null;
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && res.public_id) resolve(res);
        else reject(new Error(res?.error?.message ?? `Upload failed (${xhr.status})`));
      } catch {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => {
      xhrRef.current = null;
      reject(new Error("Upload failed. Check your connection."));
    };
    xhr.onabort = () => {
      xhrRef.current = null;
      reject(new DOMException("cancelled", "AbortError"));
    };
    xhr.send(form);
  });
}

export function PreviewUploader({
  kind,
  value,
  onChange,
  title,
}: {
  kind: PreviewKind;
  value: PreviewValue;
  onChange: (v: PreviewValue) => void;
  title: string;
}) {
  const lim = PREVIEW_LIMITS[kind];
  const { playTest } = useAudio();
  const input = useRef<HTMLInputElement>(null);
  const xhr = useRef<XMLHttpRequest | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => xhr.current?.abort(), []);

  // Video: a big or long source (e.g. a 50 MB effect, MP4 or MOV) goes to
  // the "Make preview" step instead of being refused.
  const [source, setSource] = useState<File | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (kind === "video") {
      if (!/^video\//.test(file.type) && !/\.(mp4|m4v|mov|webm|mkv|avi)$/i.test(file.name)) return setError("Choose a video file (MP4 or MOV).");
      if (file.size > SOURCE_MAX_BYTES) return setError("That video is over 1 GB, too big to process in the browser. Export a shorter part first.");
      const meta = await readVideo(file).catch(() => null);
      const fits = meta && lim.mime.test(file.type) && file.size <= lim.mb * 1024 * 1024 && meta.duration <= lim.seconds + 0.5;
      if (!fits) {
        if (input.current) input.current.value = "";
        return setSource(file);
      }
      return send(file);
    }
    // Audio: a ready 30-second MP3 under 1 MB goes straight up; anything else
    // (a full song, WAV, FLAC, M4A…) goes to the "Make preview" step.
    if (!/^audio\//.test(file.type) && !/\.(mp3|wav|m4a|aac|flac|ogg|oga|opus|aif|aiff)$/i.test(file.name)) {
      return setError("Choose an audio file (MP3, WAV, M4A, FLAC or OGG).");
    }
    if (file.size > AUDIO_SOURCE_MAX_BYTES) return setError("That file is over 300 MB, too big to process in the browser.");
    const isMp3 = lim.mime.test(file.type) || lim.re.test(file.name);
    const meta = isMp3 && file.size <= lim.mb * 1024 * 1024 ? await readAudio(file).catch(() => null) : null;
    if (!meta || meta.duration > lim.seconds + 0.5) {
      if (input.current) input.current.value = "";
      return setSource(file);
    }
    return send(file);
  };

  // Checks the final file and uploads it straight to Cloudinary.
  const send = async (file: File) => {
    try {
      const meta = kind === "audio" ? await readAudio(file) : await readVideo(file);
      if (meta.duration > lim.seconds + 0.5) {
        return setError(`That ${kind === "audio" ? "track" : "clip"} is ${formatTime(meta.duration)} long. The limit is ${lim.seconds} seconds; trim it first.`);
      }
      if (file.size > lim.mb * 1024 * 1024) return setError(`That file is ${(file.size / 1048576).toFixed(2)} MB. The limit is ${lim.mb} MB.`);
      setProgress(0);
      const ticket = await signPreviewUpload(kind);
      const res = await upload(file, ticket, setProgress, xhr);
      onChange({
        url: String(res.secure_url),
        public_id: String(res.public_id),
        version: Number(res.version),
        format: String(res.format ?? ""),
        bytes: Number(res.bytes ?? file.size),
        duration: Math.round(Number(res.duration ?? meta.duration) * 100) / 100,
        ...("peaks" in meta ? { peaks: meta.peaks } : { width: meta.width, height: meta.height }),
        saved: false,
        localUrl: URL.createObjectURL(file),
      });
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message || "Couldn’t read that file.");
    } finally {
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  };

  const src = value?.localUrl ?? value?.url;

  return (
    <div className="flex flex-col gap-3">
      <input ref={input} type="file" accept={lim.accept} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

      {source && progress === null ? (
        kind === "audio" ? (
          <AudioPreviewMaker
            key={`${source.name}-${source.size}-${source.lastModified}`}
            source={source}
            onCancel={() => setSource(null)}
            onDone={(file) => {
              setSource(null);
              void send(file);
            }}
          />
        ) : (
          <PreviewMaker
            key={`${source.name}-${source.size}-${source.lastModified}`}
            source={source}
            onCancel={() => setSource(null)}
            onDone={(file) => {
              setSource(null);
              void send(file);
            }}
          />
        )
      ) : progress !== null ? (
        <div className="flex items-center gap-3 rounded-xl border border-line p-3" role="status" aria-live="polite">
          <UploadIcon size={18} className="shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            <p className="text-sm">Uploading… {Math.round(progress * 100)}%</p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-chip">
              <div className="h-full origin-left bg-brand transition-transform duration-150" style={{ transform: `scaleX(${progress})` }} />
            </div>
          </div>
          <Button variant="ghost" onClick={() => xhr.current?.abort()}>
            Cancel
          </Button>
        </div>
      ) : value ? (
        <div className="flex flex-col gap-3 rounded-xl border border-line p-3">
          {kind === "video" && src && (
            <video
              src={value.localUrl ?? clipLoopUrl(value.url)}
              muted
              loop
              autoPlay
              playsInline
              className="aspect-video w-full max-w-[360px] rounded-lg bg-black object-cover"
            />
          )}
          <div className="flex items-center gap-3">
            {kind === "audio" && (
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand/12 text-brand">
                <MusicIcon size={20} />
              </span>
            )}
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">{kind === "audio" ? "Music preview" : "Card preview clip"}</p>
              <p className="text-xs text-fg-2">
                {formatTime(value.duration)} · {(value.bytes / 1048576).toFixed(2)} MB · {value.saved ? "Saved" : "Uploaded, not saved yet"}
              </p>
            </div>
            <Button variant="ghost" aria-label="Remove file" onClick={() => onChange(null)}>
              <CloseIcon size={16} />
            </Button>
          </div>
          {kind === "audio" && <Waveform peaks={value.peaks ?? null} progress={0} height={36} />}
          <div className="flex flex-wrap gap-2">
            {kind === "audio" && src && (
              <Button onClick={() => playTest({ title: title || "Test play", peaks: value.peaks ?? null, duration: value.duration, src })}>
                <PlayIcon size={14} /> Test play
              </Button>
            )}
            <Button onClick={() => input.current?.click()}>Replace file</Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="vh-press flex flex-col items-center gap-2 rounded-xl border border-dashed border-line px-4 py-6 text-sm text-fg-2 hover:bg-hover"
        >
          <UploadIcon size={22} className="text-brand" />
          <span className="font-medium text-fg">{kind === "audio" ? "Choose track" : "Choose video"}</span>
          <span className="text-xs">
            {kind === "audio"
              ? "Any size (MP3, WAV, M4A, FLAC, e.g. the full song). You pick 30 seconds; only that preview is uploaded."
              : "Any size (MP4 or MOV, e.g. the full effect). Big files are cut to a small 10-second preview in your browser."}
          </span>
        </button>
      )}

      {error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
