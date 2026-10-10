// YouTube IFrame Player API, loaded once and only when a preview first plays.
// verified: https://developers.google.com/youtube/iframe_api_reference
// verified: https://developers.google.com/youtube/player_parameters

export interface YTPlayer {
  mute(): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
}

interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      width?: string | number;
      height?: string | number;
      videoId: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number; target: YTPlayer }) => void;
        onError?: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { ENDED: 0; PLAYING: 1; PAUSED: 2; BUFFERING: 3; CUED: 5 };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loading: Promise<YTNamespace> | null = null;

export function loadYouTubeApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = () => {
      loading = null;
      reject(new Error("Could not load the YouTube player"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

const ID = /^[A-Za-z0-9_-]{11}$/;

/** Accepts a bare ID or any common YouTube URL form; returns the 11-char ID. */
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (ID.test(s)) return s;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return ID.test(u.pathname.slice(1)) ? u.pathname.slice(1) : null;
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const v = u.searchParams.get("v");
      if (v && ID.test(v)) return v;
      const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/);
      if (m) return m[1];
    }
  } catch {
    /* not a URL */
  }
  return null;
}

export function thumbnailUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export const PREVIEW_PLAYER_VARS = {
  autoplay: 1,
  controls: 0,
  disablekb: 1,
  fs: 0,
  iv_load_policy: 3,
  playsinline: 1,
  rel: 0,
  enablejsapi: 1,
} as const;
