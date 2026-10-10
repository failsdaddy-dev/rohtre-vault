"use client";

// Muted YouTube preview that loops between start and end seconds (R26).
// Mounted only while `active`, so at most one (or the autoplay cap) exists.
// The iframe stays invisible until YouTube reports PLAYING, then fades in,
// which hides most of the title/branding flash before playback.

import { useEffect, useRef, useState } from "react";
import { loadYouTubeApi, PREVIEW_PLAYER_VARS, type YTPlayer } from "@/lib/youtube";

const DEFAULT_LENGTH = 6;

export function PreviewPlayer({
  youtubeId,
  start,
  end,
  active,
  title,
}: {
  youtubeId: string;
  start: number;
  end: number | null;
  active: boolean;
  title: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!active) return;
    const hostEl = host.current;
    let player: YTPlayer | null = null;
    let cancelled = false;
    const stop = end ?? start + DEFAULT_LENGTH;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !hostEl) return;
        const mount = document.createElement("div");
        hostEl.appendChild(mount);
        player = new YT.Player(mount, {
          width: "100%",
          height: "100%",
          videoId: youtubeId,
          playerVars: { ...PREVIEW_PLAYER_VARS, start, end: stop, origin: window.location.origin },
          events: {
            onReady: (e) => {
              // YouTube sets its own iframe title; replace it with ours.
              const frame = hostEl.querySelector("iframe");
              if (frame) {
                frame.title = `Preview: ${title}`;
                frame.tabIndex = -1;
              }
              e.target.mute();
              e.target.playVideo();
            },
            onStateChange: (e) => {
              if (e.data === YT.PlayerState.PLAYING) setPlaying(true);
              // `loop` only works with a playlist, so loop by seeking back.
              if (e.data === YT.PlayerState.ENDED) e.target.seekTo(start, true);
            },
          },
        });
      })
      .catch(() => {
        /* Player unavailable: the thumbnail simply stays. */
      });

    return () => {
      cancelled = true;
      setPlaying(false);
      try {
        player?.destroy();
      } catch {
        /* already gone */
      }
      if (hostEl) hostEl.innerHTML = "";
    };
  }, [active, youtubeId, start, end, title]);

  return (
    <div
      ref={host}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full transition-opacity duration-[var(--dur-3)] ${
        active && playing ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
