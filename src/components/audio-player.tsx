"use client";

// The site's audio player for music (and audio sound-effect) cards.
//
// It plays the card's 30-second MP3 PREVIEW (a public Cloudinary file); the
// full track is on Mega behind the card's Download button. One track at a
// time, docked bottom-right on desktop and as a bottom sheet on phones. It
// lives in the app shell, so it keeps playing while the editor browses and
// filters. Video previews stop while audio plays.
//
// Keyboard (while focus is in the player): Space play/pause, Left/Right
// seek 5 s, M mute. Media keys work through the Media Session API.
// verified: https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getDataSource } from "@/lib/data-source";
import { previewCoordinator } from "@/lib/preview-coordinator";
import type { Card, SectionKind } from "@/lib/types";
import { useHub } from "./hub-context";
import { CardActions } from "./card-actions";
import { CardEditButton } from "./card-edit";
import { CloseIcon, LoopIcon, PauseIcon, PlayIcon, VolumeIcon, VolumeOffIcon } from "./icons";
import { Waveform } from "./waveform";

/** Previews are at most 30 seconds; the player never plays past that. */
export const AUDIO_PREVIEW_SECONDS = 30;

export interface Track {
  /** Card being played, or null for an admin "Test play" of a local file. */
  card: Card | null;
  kind: SectionKind | null;
  title: string;
  peaks: number[] | null;
  duration: number | null;
  /** The preview file (or a local file for an admin "Test play"). */
  src: string;
}

type LoadState = "loading" | "ready" | "buffering" | "error";

interface AudioValue {
  track: Track | null;
  playCard: (card: Card, kind: SectionKind) => void;
  playTest: (t: Omit<Track, "card" | "kind">) => void;
  close: () => void;
}

const AudioContext = createContext<AudioValue | null>(null);

// Lets the video modal pause audio without a provider dependency.
let pauseAll: () => void = () => {};
export function pauseAudio() {
  pauseAll();
}

export function useAudio(): AudioValue {
  const v = useContext(AudioContext);
  if (!v) throw new Error("useAudio outside AudioProvider");
  return v;
}

export function formatTime(sec: number | null | undefined): string {
  if (sec === null || sec === undefined || !Number.isFinite(sec)) return "0:00";
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const [track, setTrack] = useState<Track | null>(null);
  const playCard = useCallback((card: Card, kind: SectionKind) => {
    const src = getDataSource().audioSrc(card);
    if (!src) return;
    setTrack((t) =>
      t?.card?.id === card.id
        ? t
        : { card, kind, title: card.title, peaks: card.audioPreview?.peaks ?? null, duration: card.audioPreview?.duration ?? null, src },
    );
  }, []);
  const playTest = useCallback((t: Omit<Track, "card" | "kind">) => setTrack({ ...t, card: null, kind: null }), []);
  const close = useCallback(() => setTrack(null), []);
  const value = useMemo(() => ({ track, playCard, playTest, close }), [track, playCard, playTest, close]);
  return (
    <AudioContext.Provider value={value}>
      {children}
      {track && <AudioDock key={track.card?.id ?? track.src} track={track} onClose={close} />}
    </AudioContext.Provider>
  );
}

function AudioDock({ track, onClose }: { track: Track; onClose: () => void }) {
  const { filterBySlug } = useHub();
  const audio = useRef<HTMLAudioElement>(null);
  const src = track.src;
  const [state, setState] = useState<LoadState>("loading");
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(track.duration ?? 0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [loop, setLoop] = useState(false);
  const card = track.card;

  const retry = () => {
    setState("loading");
    audio.current?.load();
    audio.current?.play().catch(() => {});
  };

  // Autoplay once the source is set (the user just pressed Play).
  useEffect(() => {
    const el = audio.current;
    if (!el || !src) return;
    el.play().catch(() => setPlaying(false));
  }, [src]);

  // Video previews stop while audio plays.
  useEffect(() => {
    previewCoordinator.setPaused("audio", playing);
    return () => previewCoordinator.setPaused("audio", false);
  }, [playing]);

  useEffect(() => {
    pauseAll = () => audio.current?.pause();
    return () => {
      pauseAll = () => {};
    };
  }, []);

  const toggle = useCallback(() => {
    const el = audio.current;
    if (!el || !src) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }, [src]);
  const seekTo = useCallback((t: number) => {
    const el = audio.current;
    if (!el || !Number.isFinite(t)) return;
    el.currentTime = Math.max(0, Math.min(t, el.duration || t));
  }, []);
  const seekBy = useCallback((d: number) => seekTo((audio.current?.currentTime ?? 0) + d), [seekTo]);
  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  useEffect(() => {
    if (audio.current) audio.current.volume = volume;
  }, [volume]);
  useEffect(() => {
    if (audio.current) audio.current.muted = muted;
  }, [muted]);
  useEffect(() => {
    if (audio.current) audio.current.loop = loop;
  }, [loop]);

  // Media keys / lock screen.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({ title: track.title, artist: "RohTre Vault" });
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => audio.current?.play()],
      ["pause", () => audio.current?.pause()],
      ["seekbackward", () => seekBy(-5)],
      ["seekforward", () => seekBy(5)],
      ["seekto", (d) => d.seekTime !== undefined && seekTo(d.seekTime)],
    ];
    for (const [a, h] of handlers) {
      try {
        ms.setActionHandler(a, h);
      } catch {
        /* action not supported */
      }
    }
    return () => {
      for (const [a] of handlers) {
        try {
          ms.setActionHandler(a, null);
        } catch {
          /* ignore */
        }
      }
      ms.metadata = null;
    };
  }, [track.title, seekBy, seekTo]);

  const onKey = (e: React.KeyboardEvent) => {
    const t = e.target as HTMLElement;
    const inControl = t.tagName === "BUTTON" || t.tagName === "INPUT";
    if (e.key === " " && !inControl) {
      e.preventDefault();
      toggle();
    } else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && t.tagName !== "INPUT") {
      e.preventDefault();
      seekBy(e.key === "ArrowLeft" ? -5 : 5);
    } else if (e.key === "m" || e.key === "M") {
      toggleMute();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const chips = (card?.filterSlugs ?? []).map((s) => filterBySlug.get(s)?.name).filter((n): n is string => !!n);
  const total = Math.min(duration || 0, AUDIO_PREVIEW_SECONDS);
  const progress = total ? Math.min(1, time / total) : 0;
  const status =
    state === "loading"
      ? "Loading…"
      : state === "buffering"
        ? "Buffering…"
        : state === "error"
          ? "Couldn’t load this preview."
          : null;

  return (
    <section
      aria-label={`Audio player: ${track.title}`}
      onKeyDown={onKey}
      className="vh-dock-in fixed z-[60] flex flex-col gap-3 border border-line bg-menu p-4 shadow-2xl max-sm:inset-x-0 max-sm:bottom-0 max-sm:rounded-t-[22px] max-sm:pb-[max(16px,env(safe-area-inset-bottom))] sm:bottom-4 sm:right-4 sm:w-[400px] sm:rounded-[22px]"
    >
      <audio
        ref={audio}
        src={src ?? undefined}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          // Never past the 30-second preview, even if a longer file slipped in.
          if (el.currentTime >= AUDIO_PREVIEW_SECONDS) {
            el.currentTime = 0;
            if (!el.loop) el.pause();
          }
          setTime(el.currentTime);
        }}
        onDurationChange={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
        onWaiting={() => setState("buffering")}
        onPlaying={() => setState("ready")}
        onCanPlay={() => setState((s) => (s === "loading" || s === "buffering" ? "ready" : s))}
        onProgress={(e) => {
          const el = e.currentTarget;
          if (el.buffered.length && el.duration) setBuffered(el.buffered.end(el.buffered.length - 1) / el.duration);
        }}
        onError={() => setState("error")}
      />

      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{track.title}</p>
          {chips.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-fg-2">
              {chips.slice(0, 4).map((c) => (
                <span key={c} className="rounded-md bg-chip px-1.5 py-0.5">
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Admins only; the track keeps playing while the drawer is open. */}
        {card && <CardEditButton card={card} look="header" className="-mt-0.5" />}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close player"
          className="vh-press no-lift -mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-full hover:bg-hover"
        >
          <CloseIcon size={18} />
        </button>
      </div>

      <Waveform peaks={track.peaks} progress={progress} buffered={buffered} onSeek={(f) => seekTo(f * total)} />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={state === "error"}
          aria-label={playing ? "Pause" : "Play"}
          className="vh-press no-lift grid size-11 shrink-0 place-items-center rounded-full bg-brand text-brand-fg disabled:opacity-50"
        >
          {playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <input
            type="range"
            min={0}
            max={total}
            step={0.1}
            value={Math.min(time, total)}
            onChange={(e) => seekTo(Number(e.target.value))}
            aria-label="Seek"
            aria-valuetext={`${formatTime(time)} of ${formatTime(total)}`}
            className="vh-range"
            style={{ ["--fill" as string]: `${progress * 100}%`, ["--buf" as string]: `${buffered * 100}%` }}
          />
          <div className="flex justify-between font-mono text-xs tabular-nums text-fg-2">
            <span>{formatTime(time)}</span>
            <span aria-live="polite" className="font-sans">
              {status}
            </span>
            <span>{formatTime(total)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          aria-pressed={muted}
          className="vh-press no-lift grid size-9 shrink-0 place-items-center rounded-full hover:bg-hover"
        >
          {muted || volume === 0 ? <VolumeOffIcon size={18} /> : <VolumeIcon size={18} />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={(e) => {
            setVolume(Number(e.target.value));
            setMuted(false);
          }}
          aria-label="Volume"
          className="vh-range w-24"
          style={{ ["--fill" as string]: `${(muted ? 0 : volume) * 100}%`, ["--buf" as string]: "0%" }}
        />
        <button
          type="button"
          onClick={() => setLoop((l) => !l)}
          aria-label="Loop"
          aria-pressed={loop}
          className={`vh-press no-lift grid size-9 shrink-0 place-items-center rounded-full hover:bg-hover ${loop ? "text-brand" : ""}`}
        >
          <LoopIcon size={18} />
        </button>
        <div className="flex-1" />
        {state === "error" && (
          <button type="button" onClick={retry} className="vh-press h-9 rounded-full bg-chip px-3 text-sm font-medium hover:bg-chip-hover">
            Retry
          </button>
        )}
      </div>

      {/* The card's own buttons: Tutorial, Open on platform, Download (the full file, from Mega). */}
      {card && track.kind && <CardActions card={card} kind={track.kind} />}
    </section>
  );
}
