import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRightIcon, FolderIcon, PlayIcon, SECTION_ICONS, VaultLogo } from "@/components/icons";
import { LandingIntro } from "@/components/landing-intro";
import { ThemeToggle, Wordmark } from "@/components/top-bar";

// Public front door. It shows no library content: only what the tool is and
// a way to sign in. Signed-in visitors are sent to /effects by the proxy.

const STATS = [
  { value: "5", label: "Libraries", sub: "Effects to fonts" },
  { value: "1", label: "Standard", sub: "Style for every edit" },
  { value: "100%", label: "Private", sub: "Login required" },
  { value: "0", label: "Public sign-ups", sub: "Admin invites only" },
];

const LIBRARIES: { kind: keyof typeof SECTION_ICONS; title: string; body: string }[] = [
  { kind: "effect", title: "Effects", body: "Approved transitions, looks and motion presets." },
  { kind: "music", title: "Music", body: "Tracks cleared for the studio's edits." },
  { kind: "sound", title: "Sound effects", body: "Hits, whooshes and risers that match the style." },
  { kind: "font", title: "Fonts", body: "The typefaces every title should use." },
  { kind: "text", title: "Text & graphics", body: "Ready-made text presets and lower thirds." },
];

const STEPS = [
  { icon: PlayIcon, title: "Preview", body: "Hover any card to watch the effect play." },
  { icon: SECTION_ICONS.text, title: "Learn", body: "Each one has a short Loom tutorial." },
  { icon: FolderIcon, title: "Use", body: "Project files and downloads, one click away." },
];

const delay = (i: number) => ({ "--i": i }) as CSSProperties;

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingIntro />

      <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Wordmark />
          <nav className="hidden items-center gap-8 text-sm font-medium text-fg-2 md:flex">
            <a href="#libraries" className="hover:text-fg">Libraries</a>
            <a href="#how" className="hover:text-fg">How it works</a>
            <a href="#access" className="hover:text-fg">Access</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="vh-press inline-flex h-10 items-center gap-2 rounded-full bg-chip-on-bg px-5 text-sm font-semibold text-chip-on-fg hover:opacity-90"
            >
              Sign in <ArrowRightIcon size={16} strokeWidth={2.2} />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="vh-hero-bg relative overflow-hidden px-4 pb-24 pt-20 text-center sm:pt-28">
          <p
            style={delay(0)}
            className="vh-hero-in mx-auto inline-flex rounded-full border border-line px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-brand"
          >
            Private studio library
          </p>
          <h1
            style={delay(1)}
            className="vh-hero-in mx-auto mt-7 max-w-4xl text-[clamp(2.4rem,6.5vw,4.75rem)] font-bold leading-[1.02] tracking-[-0.04em] [text-wrap:balance]"
          >
            Every approved effect, <span className="vh-text-grad">locked in one vault.</span>
          </h1>
          <p style={delay(2)} className="vh-hero-in mx-auto mt-6 max-w-2xl text-lg text-fg-2 [text-wrap:balance]">
            Effects, music, sound effects, fonts and text presets, each with a preview, a tutorial and its project
            files. One standard style for every RohTre edit.
          </p>
          <div style={delay(3)} className="vh-hero-in mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="vh-press inline-flex h-13 items-center gap-2 rounded-full bg-brand px-8 text-base font-semibold text-brand-fg hover:opacity-90"
            >
              Open the vault <ArrowRightIcon size={18} strokeWidth={2.2} />
            </Link>
            <a
              href="#how"
              className="vh-press inline-flex h-13 items-center gap-2 rounded-full border border-line px-8 text-base font-semibold hover:bg-hover"
            >
              How it works <ArrowRightIcon size={18} strokeWidth={2.2} />
            </a>
          </div>
        </section>

        {/* Stats strip */}
        <section className="px-4">
          <div className="vh-offset mx-auto -mt-6 grid max-w-5xl grid-cols-2 rounded-[28px] [--offset-surface:var(--bg-elev)] md:grid-cols-4">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className={`flex flex-col items-center px-4 py-8 text-center ${i % 2 ? "border-l-2 border-fg" : ""} ${
                  i > 1 ? "border-t-2 border-fg md:border-t-0" : ""
                } ${i === 2 ? "md:border-l-2" : ""}`}
              >
                <p className="text-[clamp(2.2rem,5vw,3.5rem)] font-bold leading-none tracking-[-0.04em]">{s.value}</p>
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.25em]">{s.label}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-fg-2">{s.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Libraries */}
        <section id="libraries" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-28 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">Inside the vault</p>
          <h2 className="mt-3 text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.05] tracking-[-0.04em]">
            Five libraries. <span className="vh-text-grad">Zero guesswork.</span>
          </h2>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {LIBRARIES.map(({ kind, title, body }) => {
              const Icon = SECTION_ICONS[kind];
              return (
                <li key={kind} className="vh-offset on-hover rounded-[20px] border border-line p-7 [--offset-surface:var(--bg-elev)]">
                  <span className="grid size-12 place-items-center rounded-xl bg-brand/12 text-brand">
                    <Icon size={24} />
                  </span>
                  <p className="mt-5 text-lg font-semibold">{title}</p>
                  <p className="mt-1.5 text-fg-2">{body}</p>
                </li>
              );
            })}
            <li className="flex flex-col justify-center rounded-[20px] bg-chip p-7">
              <p className="text-lg font-semibold">Only what&apos;s approved</p>
              <p className="mt-1.5 text-fg-2">The admin adds every card, so nothing off-style gets in.</p>
            </li>
          </ul>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-28 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">How it works</p>
          <h2 className="mt-3 text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.05] tracking-[-0.04em]">
            Preview. Learn. <span className="vh-text-grad">Use.</span>
          </h2>
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="relative overflow-hidden rounded-[20px] border border-line p-7">
                <span className="absolute right-5 top-3 text-6xl font-bold text-fg/5">0{i + 1}</span>
                <span className="grid size-12 place-items-center rounded-full bg-chip-on-bg text-chip-on-fg">
                  <Icon size={22} />
                </span>
                <p className="mt-5 text-lg font-semibold">{title}</p>
                <p className="mt-1.5 text-fg-2">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Closing call to action */}
        <section id="access" className="scroll-mt-20 px-4 pb-20 pt-28 sm:px-6">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[28px] border border-line">
            <div aria-hidden="true" className="absolute inset-0 flex">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="vh-stripes h-full flex-1 border-r border-[var(--intro-line)] last:border-r-0" />
              ))}
            </div>
            <div className="relative flex flex-col items-center px-6 py-20 text-center text-[var(--intro-fg)]">
              <VaultLogo size={64} />
              <h2 className="mt-6 text-[clamp(2rem,5vw,3.5rem)] font-bold leading-none tracking-[-0.04em]">
                ROHTRE VAULT
              </h2>
              <p className="mt-4 max-w-md text-base opacity-80">
                Accounts are created by the admin. There is no public sign-up.
              </p>
              <Link
                href="/login"
                className="vh-press mt-8 inline-flex h-13 items-center gap-2 rounded-full bg-chip-on-bg px-8 text-base font-semibold text-chip-on-fg hover:opacity-90"
              >
                Sign in <ArrowRightIcon size={18} strokeWidth={2.2} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-fg-2 sm:flex-row sm:px-6">
          <Wordmark />
          <p>For RohTre studio editors only</p>
        </div>
      </footer>
    </div>
  );
}
