"use client";

// "Make preview" step for big source videos (e.g. a 50 MB+ effect from Mega,
// MP4 or transparent MOV). Everything happens in this browser: the admin
// picks which seconds to use, the video tool cuts and shrinks them to a
// small silent MP4 (under 2 MB), and only that small file is uploaded.

import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { useEffect, useRef, useState } from "react";
import { loadVideoTool, makePreview, openSource, stillFrame } from "@/lib/make-preview";
import { formatTime } from "../audio-player";
import { Button } from "./ui";

const LENGTHS = [6, 8, 10] as const;

type Phase =
  | { kind: "loading"; note: string }
  | { kind: "ready" }
  | { kind: "making"; progress: number }
  | { kind: "done"; file: File; url: string }
  | { kind: "error"; message: string };

export function PreviewMaker({ source, onDone, onCancel }: { source: File; onDone: (file: File) => void; onCancel: () => void }) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading", note: "Loading the video tool… (about 32 MB the first time)" });
  const [duration, setDuration] = useState(0);
  const [length, setLength] = useState<number>(6);
  const [start, setStart] = useState(0);
  const [canPlay, setCanPlay] = useState(true);
  const [still, setStill] = useState<string | null>(null);
  const ff = useRef<FFmpeg | null>(null);
  const input = useRef<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [sourceUrl] = useState(() => URL.createObjectURL(source));

  // Load the tool and read the source once.
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const tool = await loadVideoTool();
        if (!live) return;
        ff.current = tool;
        setPhase({ kind: "loading", note: "Reading the video…" });
        const src = await openSource(tool, source);
        if (!live) return;
        input.current = src.input;
        setDuration(src.duration);
        setPhase({ kind: "ready" });
      } catch (e) {
        if (live) setPhase({ kind: "error", message: (e as Error).message || "The video tool couldn’t start." });
      }
    })();
    return () => {
      live = false;
      URL.revokeObjectURL(sourceUrl);
      const tool = ff.current;
      if (tool && input.current) void tool.deleteFile(input.current).catch(() => {});
    };
  }, [source, sourceUrl]);

  const maxStart = Math.max(0, duration - length);
  const from = Math.min(start, maxStart);

  // Show the chosen moment: the browser's own player when it can play the
  // file, otherwise a still frame made by the tool (e.g. ProRes .mov).
  useEffect(() => {
    if (phase.kind !== "ready") return;
    if (canPlay) {
      if (video.current) video.current.currentTime = from;
      return;
    }
    const tool = ff.current;
    const name = input.current;
    if (!tool || !name) return;
    let live = true;
    const t = setTimeout(async () => {
      try {
        const blob = await stillFrame(tool, name, from);
        if (!live) return;
        setStill((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
      } catch {
        /* keep the previous frame */
      }
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [from, canPlay, phase.kind]);

  const make = async () => {
    const tool = ff.current;
    const name = input.current;
    if (!tool || !name) return;
    setPhase({ kind: "making", progress: 0 });
    try {
      const file = await makePreview(tool, name, from, Math.min(length, duration || length), (p) => setPhase({ kind: "making", progress: p }));
      setPhase({ kind: "done", file, url: URL.createObjectURL(file) });
    } catch (e) {
      setPhase({ kind: "error", message: (e as Error).message });
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line p-3">
      <div className="text-sm">
        <p className="font-medium">Make a card preview from your video</p>
        <p className="text-xs text-fg-2">
          {source.name} · {(source.size / 1048576).toFixed(1)} MB{duration ? ` · ${formatTime(duration)}` : ""}. It stays on this computer; only the
          small preview is uploaded.
        </p>
      </div>

      {phase.kind === "done" ? (
        <video src={phase.url} muted loop autoPlay playsInline className="aspect-video w-full max-w-[420px] rounded-lg bg-black object-cover" />
      ) : canPlay ? (
        <video
          ref={video}
          src={sourceUrl}
          muted
          playsInline
          preload="metadata"
          onError={() => setCanPlay(false)}
          className="aspect-video w-full max-w-[420px] rounded-lg bg-black object-contain"
        />
      ) : still ? (
        // eslint-disable-next-line @next/next/no-img-element -- a local blob, no optimisation needed
        <img src={still} alt="Frame at the chosen start" className="aspect-video w-full max-w-[420px] rounded-lg bg-black object-contain" />
      ) : (
        <div className="grid aspect-video w-full max-w-[420px] place-items-center rounded-lg bg-black text-xs text-white/60">Preview frame loading…</div>
      )}

      {phase.kind === "loading" && (
        <p role="status" className="text-sm text-fg-2">
          {phase.note}
        </p>
      )}

      {(phase.kind === "ready" || phase.kind === "making") && duration > 0 && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="flex justify-between">
              <span className="font-medium">Start at</span>
              <span className="font-mono text-xs text-fg-2">
                {formatTime(from)} → {formatTime(Math.min(duration, from + length))}
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={maxStart}
              step={0.1}
              value={from}
              disabled={phase.kind === "making" || maxStart === 0}
              onChange={(e) => setStart(Number(e.target.value))}
              className="vh-range"
              style={{ ["--fill" as string]: `${maxStart ? (from / maxStart) * 100 : 0}%`, ["--buf" as string]: "0%" }}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">Length</span>
            {LENGTHS.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={length === l}
                disabled={phase.kind === "making"}
                onClick={() => setLength(l)}
                className={`vh-press h-8 rounded-lg px-3 font-medium ${length === l ? "bg-chip-on-bg text-chip-on-fg" : "bg-chip hover:bg-chip-hover"}`}
              >
                {l} s
              </button>
            ))}
          </div>
        </div>
      )}

      {phase.kind === "making" && (
        <div role="status" aria-live="polite" className="flex flex-col gap-1.5">
          <p className="text-sm">Making the preview… {Math.round(phase.progress * 100)}% (this can take a minute)</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-chip">
            <div className="h-full origin-left bg-brand transition-transform duration-150" style={{ transform: `scaleX(${phase.progress})` }} />
          </div>
        </div>
      )}

      {phase.kind === "done" && (
        <p className="text-sm text-fg-2">
          Preview ready: {formatTime(Math.min(length, duration))} · {(phase.file.size / 1048576).toFixed(2)} MB
        </p>
      )}
      {phase.kind === "error" && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {phase.message}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {phase.kind === "ready" && (
          <Button variant="primary" onClick={make}>
            Make preview
          </Button>
        )}
        {phase.kind === "done" && (
          <>
            <Button variant="primary" onClick={() => onDone(phase.file)}>
              Use this preview
            </Button>
            <Button onClick={() => setPhase({ kind: "ready" })}>Change</Button>
          </>
        )}
        {phase.kind === "error" && duration > 0 && <Button onClick={() => setPhase({ kind: "ready" })}>Try again</Button>}
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
