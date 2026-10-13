"use client";

import type { ReactNode } from "react";
import { AudioProvider } from "./audio-player";
import { CardEditProvider } from "./card-edit";
import { Guide } from "./guide";
import { useHub } from "./hub-context";
import { TopBar } from "./top-bar";

const OFFSET = { full: "pl-[var(--guide-full)]", mini: "pl-[var(--guide-mini)]", none: "" } as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { guideMode } = useHub();
  return (
    // Edit (admins) wraps the audio player so its dock can show Edit too.
    <CardEditProvider>
      <AudioProvider>
        <a
          href="#main"
          className="fixed left-2 top-2 z-[70] -translate-y-20 rounded-md bg-chip-on-bg px-3 py-2 text-sm text-chip-on-fg focus:translate-y-0"
        >
          Skip to content
        </a>
        <TopBar />
        <Guide />
        <main id="main" className={`min-h-screen pt-14 ${OFFSET[guideMode]}`}>
          {children}
        </main>
      </AudioProvider>
    </CardEditProvider>
  );
}

/** Static first paint while the signed-in shell streams in. */
export function ShellFallback() {
  return (
    <div aria-hidden="true">
      <div className="fixed inset-x-0 top-0 h-14 bg-bg" />
    </div>
  );
}
