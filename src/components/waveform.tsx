"use client";

// Waveform bars that fill with the brand colour as the track plays, with a
// lighter layer for what has buffered. Bar heights come from audio_peaks
// (computed in the admin's browser at upload); without them, even bars.
// Clicking a bar seeks; the range input next to it is the accessible control.

import { memo } from "react";

const FALLBACK = Array.from({ length: 64 }, (_, i) => 0.35 + 0.25 * Math.abs(Math.sin(i * 0.5)));

export const Waveform = memo(function Waveform({
  peaks,
  progress,
  buffered = 0,
  onSeek,
  height = 56,
  bars = 72,
}: {
  peaks: number[] | null;
  progress: number;
  buffered?: number;
  onSeek?: (fraction: number) => void;
  height?: number;
  bars?: number;
}) {
  const src = peaks && peaks.length ? peaks : FALLBACK;
  // Resample to the bar count so every waveform has the same rhythm.
  const values = Array.from({ length: bars }, (_, i) => {
    const a = Math.floor((i / bars) * src.length);
    const b = Math.max(a + 1, Math.floor(((i + 1) / bars) * src.length));
    let m = 0;
    for (let k = a; k < b; k++) m = Math.max(m, src[k] ?? 0);
    return Math.max(0.08, Math.min(1, m));
  });
  const row = (cls: string) => (
    <div className="absolute inset-0 flex items-center gap-[2px]">
      {values.map((v, i) => (
        <span key={i} className={`flex-1 rounded-full ${cls}`} style={{ height: `${v * 100}%` }} />
      ))}
    </div>
  );
  const clip = (f: number) => ({ clipPath: `inset(0 ${100 - Math.max(0, Math.min(1, f)) * 100}% 0 0)` });

  return (
    <div
      aria-hidden="true"
      className={`relative w-full ${onSeek ? "cursor-pointer" : ""}`}
      style={{ height }}
      onClick={(e) => {
        if (!onSeek) return;
        const r = e.currentTarget.getBoundingClientRect();
        onSeek((e.clientX - r.left) / r.width);
      }}
    >
      {row("bg-fg/15")}
      <div className="absolute inset-0" style={clip(buffered)}>
        {row("bg-fg/30")}
      </div>
      <div className="absolute inset-0" style={clip(progress)}>
        {row("bg-brand")}
      </div>
    </div>
  );
});
