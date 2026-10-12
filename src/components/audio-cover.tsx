"use client";

// Cover for audio cards: a gradient picked from the title (brand red mixed
// with the placeholder tones), a music icon, the preview's waveform, a Play
// button and the preview length (max 30 s). No YouTube thumbnail.

import type { Card } from "@/lib/types";
import { formatTime } from "./audio-player";
import { MusicIcon, PlayIcon } from "./icons";
import { Waveform } from "./waveform";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

export function AudioCover({ card, onPlay, size = "card" }: { card: Card; onPlay: () => void; size?: "card" | "page" }) {
  const n = hash(card.title);
  const angle = 110 + Math.round(n * 120);
  const mix = 22 + Math.round(n * 38);
  const big = size === "page";
  return (
    <div
      className="absolute inset-0 flex flex-col justify-between p-4"
      style={{
        background: `linear-gradient(${angle}deg, color-mix(in srgb, var(--brand) ${mix}%, var(--ph-a)), var(--ph-b) 70%)`,
      }}
    >
      <MusicIcon size={big ? 34 : 22} className="text-white/80" />
      <div className="flex flex-1 items-center justify-center">
        {card.audioPreview ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPlay();
            }}
            aria-label={`Play ${card.title}`}
            className={`vh-press no-lift grid place-items-center rounded-full bg-brand text-brand-fg shadow-lg transition-transform duration-200 hover:scale-105 ${
              big ? "size-20" : "size-14"
            }`}
          >
            <PlayIcon size={big ? 34 : 26} />
          </button>
        ) : (
          <span className="rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white/85">No audio yet</span>
        )}
      </div>
      <div className="opacity-70">
        <Waveform peaks={card.audioPreview?.peaks ?? null} progress={0} height={big ? 44 : 26} bars={big ? 90 : 48} />
      </div>
      {card.audioPreview && (
        <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1 text-xs font-medium text-white">
          {formatTime(Math.min(card.audioPreview.duration, 30))}
        </span>
      )}
    </div>
  );
}
