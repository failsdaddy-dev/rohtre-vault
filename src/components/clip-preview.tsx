"use client";

// The card's silent preview loop: a short clip on Cloudinary played by the
// browser's own <video>, so there are no player buttons or logos (like
// CapCut's effect tiles). Cloudinary serves a small card-sized MP4 without
// sound. Mounted only while the card has a preview slot; `delayMs` staggers
// starts. The card underneath stays one big link.

import { useEffect, useState } from "react";
import { clipLoopUrl } from "@/lib/cloudinary-url";

export function ClipPreview({ url, active, delayMs = 0 }: { url: string; active: boolean; delayMs?: number }) {
  const [go, setGo] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setGo(true), delayMs);
    return () => {
      clearTimeout(t);
      setGo(false);
      setShown(false);
    };
  }, [active, delayMs]);

  if (!active || !go) return null;
  return (
    <video
      src={clipLoopUrl(url)}
      muted
      loop
      autoPlay
      playsInline
      preload="auto"
      aria-hidden="true"
      tabIndex={-1}
      onPlaying={() => setShown(true)}
      className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"}`}
    />
  );
}
