"use client";

// "Make preview" step for full music tracks (any size / format: MP3, WAV,
// M4A/AAC, FLAC, OGG). The admin drags a 30-second window over the song's
// waveform (or uses the slider), can listen to that part first, and the
// browser cuts it into a small MP3 with a soft fade. Only that preview is
// uploaded; the full track stays on this computer.

import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { useEffect, useRef, useState } from "react";
import { AUDIO_PREVIEW_SECONDS, audioPeaks, loadVideoTool, makeAudioPreview, openSource } from "@/lib/make-preview";
import { formatTime } from "../audio-player";
import { PauseIcon, PlayIcon } from "../icons";
import { Waveform } from "../waveform";
import { Button } from "./ui";

type Phase =
  | { kind: "loading"; note: string }
  | { kind: "ready" }
  | { kind: "making"; progress: number }
  | { kind: "done"; file: File; url: string }
  | { kind: "error"; message: string };

export function AudioPreviewMaker({ source, onDone, onCancel }: { source: File; onDone: (file: File) => void; onCancel: () => void }) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading", note: "Loading the audio tool… (about 32 MB the first time)" });
  const [duration, setDuration] = useState(0);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [start, setStart] = useState(0);
  const [fade, setFade] = useState(true);
  const [listening, setListening] = useState(false);
  const [canPlay, setCanPlay] = useState(true);
  const ff = useRef<FFmpeg | null>(null);
  const input = useRef<string | null>(null);
  const player = useRef<HTMLAudioElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [sourceUrl] = useState(() => URL.createObjectURL(source));

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const tool = await loadVideoTool();
        if (!live) return;
        ff.current = tool;
        setPhase({ kind: "loading", note: "Reading the track…" });
        const src = await openSource(tool, source);
        if (!live) return;
        input.current = src.input;
        setDuration(src.duration);
        setPhase({ kind: "loading", note: "Drawing the waveform…" });
        const p = await audioPeaks(tool, src.input).catch(() => null);
        if (!live) return;
        setPeaks(p);
        setPhase({ kind: "ready" });
      } catch (e) {
        if (live) setPhase({ kind: "error", message: (e as Error).message || "The audio tool couldn’t start." });
      }
    })();
    return () => {
      live = false;
      URL.revokeObjectURL(sourceUrl);
      const tool = ff.current;
      if (tool && input.current) void tool.deleteFile(input.current).catch(() => {});
    };
  }, [source, sourceUrl]);

  const length = Math.min(AUDIO_PREVIEW_SECONDS, duration || AUDIO_PREVIEW_SECONDS);
  const maxStart = Math.max(0, duration - length);
  const from = Math.min(start, maxStart);

  // Listen to the chosen part with the browser's own player (stops after it).
  const listen = () => {
    const el = player.current;
    if (!el) return;
    if (listening) {
      el.pause();
      return;
    }
    el.currentTime = from;
    el.play().catch(() => setCanPlay(false));
  };

  // Drag the 30-second window along the waveform.
  const dragTo = (clientX: number) => {
    const r = strip.current?.getBoundingClientRect();
    if (!r || !duration) return;
    const at = ((clientX - r.left) / r.width) * duration - length / 2;
    setStart(Math.max(0, Math.min(maxStart, at)));
  };

  const make = async () => {
    const tool = ff.current;
    const name = input.current;
    if (!tool || !name) return;
    player.current?.pause();
    setPhase({ kind: "making", progress: 0 });
    try {
      const file = await makeAudioPreview(tool, name, from, length, fade, (p) => setPhase({ kind: "making", progress: p }));
      setPhase({ kind: "done", file, url: URL.createObjectURL(file) });
    } catch (e) {
      setPhase({ kind: "error", message: (e as Error).message });
    }
  };

  const busy = phase.kind === "making";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line p-3">
      <div className="text-sm">
        <p className="font-medium">Make a music preview from your track</p>
        <p className="text-xs text-fg-2">
          {source.name} · {(source.size / 1048576).toFixed(1)} MB{duration ? ` · ${formatTime(duration)}` : ""}. It stays on this computer; only the
          30-second preview is uploaded.
        </p>
      </div>

      <audio
        ref={player}
        src={sourceUrl}
        preload="metadata"
        onPlay={() => setListening(true)}
        onPause={() => setListening(false)}
        onError={() => setCanPlay(false)}
        onTimeUpdate={(e) => {
          if (e.currentTarget.currentTime >= from + length) e.currentTarget.pause();
        }}
      />

      {phase.kind === "done" ? (
        <audio src={phase.url} controls className="w-full max-w-[520px]" />
      ) : (
        duration > 0 && (
          <div
            ref={strip}
            className={`relative select-none rounded-lg bg-chip px-2 py-2 ${busy ? "" : "cursor-grab active:cursor-grabbing"}`}
            onPointerDown={(e) => {
              if (busy) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              dragTo(e.clientX);
            }}
            onPointerMove={(e) => {
              if (!busy && e.buttons === 1) dragTo(e.clientX);
            }}
          >
            <Waveform peaks={peaks} progress={0} height={64} bars={120} />
            {/* The chosen 30 seconds. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-1 rounded-md border-2 border-brand bg-brand/20"
              style={{ left: `calc(8px + (100% - 16px) * ${from / duration})`, width: `calc((100% - 16px) * ${length / duration})` }}
            />
          </div>
        )
      )}

      {phase.kind === "loading" && (
        <p role="status" className="text-sm text-fg-2">
          {phase.note}
        </p>
      )}

      {(phase.kind === "ready" || busy) && duration > 0 && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="flex justify-between">
              <span className="font-medium">Start at</span>
              <span className="font-mono text-xs text-fg-2">
                {formatTime(from)} → {formatTime(from + length)}
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={maxStart}
              step={0.1}
              value={from}
              disabled={busy || maxStart === 0}
              onChange={(e) => setStart(Number(e.target.value))}
              className="vh-range"
              style={{ ["--fill" as string]: `${maxStart ? (from / maxStart) * 100 : 0}%`, ["--buf" as string]: "0%" }}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={fade} disabled={busy} onChange={(e) => setFade(e.target.checked)} className="accent-[var(--brand)]" />
            Soft fade in and out (0.5 s)
          </label>
        </div>
      )}

      {busy && (
        <div role="status" aria-live="polite" className="flex flex-col gap-1.5">
          <p className="text-sm">Making the preview… {Math.round(phase.progress * 100)}%</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-chip">
            <div className="h-full origin-left bg-brand transition-transform duration-150" style={{ transform: `scaleX(${phase.progress})` }} />
          </div>
        </div>
      )}

      {phase.kind === "done" && (
        <p className="text-sm text-fg-2">
          Preview ready: {formatTime(length)} · {(phase.file.size / 1048576).toFixed(2)} MB
        </p>
      )}
      {phase.kind === "error" && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {phase.message}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {phase.kind === "ready" && (
          <>
            {canPlay && (
              <Button onClick={listen}>
                {listening ? <PauseIcon size={14} /> : <PlayIcon size={14} />} {listening ? "Stop" : "Listen to this part"}
              </Button>
            )}
            <Button variant="primary" onClick={make}>
              Make preview
            </Button>
          </>
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
