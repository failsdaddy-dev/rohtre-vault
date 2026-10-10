"use client";

// Per-browser preferences (theme, autoplay). Stored in localStorage; every
// access is guarded because storage can be blocked.

import { useSyncExternalStore } from "react";
import { SETTINGS_KEY as KEY } from "./theme-boot";

export type Theme = "dark" | "light";

export interface Settings {
  theme: Theme;
  autoplay: boolean;
}

const DEFAULTS: Settings = { theme: "dark", autoplay: false };

let current: Settings | null = null;
const listeners = new Set<() => void>();

function read(): Settings {
  if (current) return current;
  try {
    const raw = window.localStorage.getItem(KEY);
    current = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    current = DEFAULTS;
  }
  return current!;
}

export function updateSettings(patch: Partial<Settings>) {
  current = { ...read(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* storage blocked: keep the in-memory value */
  }
  if (patch.theme) document.documentElement.dataset.theme = patch.theme;
  for (const l of listeners) l();
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => DEFAULTS,
  );
}
