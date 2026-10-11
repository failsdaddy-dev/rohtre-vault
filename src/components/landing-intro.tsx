"use client";

import { useEffect, useState, type CSSProperties } from "react";

// Opening animation for the landing page: red stripes fall in, the name
// rises, then the stripes fall away to reveal the page. Purely decorative,
// so it is hidden from screen readers; any click or key skips it. Hidden by
// CSS when the visitor prefers reduced motion.

const COLUMNS = 10;
const NAME = "ROHTRE VAULT";
const TOTAL_MS = 2300 + (COLUMNS - 1) * 60 + 600;

export function LandingIntro() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) {
      document.documentElement.dataset.introDone = "";
      return;
    }
    const finish = () => setDone(true);
    const t = setTimeout(finish, TOTAL_MS + 100);
    window.addEventListener("keydown", finish, { once: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", finish);
    };
  }, [done]);

  if (done) return null;

  return (
    <div aria-hidden="true" onClick={() => setDone(true)} className="vh-intro fixed inset-0 z-[100] flex overflow-hidden">
      <div className="vh-intro-backdrop absolute inset-0" />
      {Array.from({ length: COLUMNS }, (_, i) => (
        <div
          key={i}
          style={{ "--i": i } as CSSProperties}
          className="vh-intro-col vh-stripes relative h-full flex-1 border-r border-[var(--intro-line)] last:border-r-0"
        />
      ))}
      <div className="vh-intro-text pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-[var(--intro-fg)]">
        <p className="text-center text-[clamp(2.4rem,9vw,6.5rem)] font-bold leading-none tracking-[-0.04em]">
          {NAME.split("").map((ch, i) => (
            <span key={i} style={{ "--i": i } as CSSProperties} className="vh-intro-letter">
              {ch === " " ? " " : ch}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
