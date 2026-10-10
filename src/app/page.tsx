import Link from "next/link";
import { FolderIcon, PlayIcon, SECTION_ICONS } from "@/components/icons";
import { ThemeToggle, Wordmark } from "@/components/top-bar";

// Public front door. It shows no library content: only what the tool is and
// a way to sign in. Signed-in visitors are sent to /effects by the proxy.

const STEPS = [
  { icon: PlayIcon, title: "Preview", body: "Hover any card to see the effect play." },
  { icon: SECTION_ICONS.text, title: "Learn", body: "A short Loom tutorial for each one." },
  { icon: FolderIcon, title: "Use", body: "Project files and downloads, one click away." },
];

const DECOR: (keyof typeof SECTION_ICONS)[] = ["effect", "music", "sound", "font", "text", "effect"];

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between px-4 sm:px-6">
        <Wordmark />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="vh-press inline-flex h-9 items-center rounded-full bg-chip-on-bg px-4 text-sm font-medium text-chip-on-fg hover:opacity-90"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 pb-16 pt-16 text-center sm:pt-24">
        <p className="vh-route-in text-xs font-medium uppercase tracking-[0.18em] text-brand">Internal studio library</p>
        <h1 className="vh-route-in mt-4 max-w-3xl text-[clamp(2.25rem,6vw,4rem)] font-semibold leading-[1.05] tracking-[-0.03em] [text-wrap:balance]">
          Every approved effect, in one place.
        </h1>
        <p className="vh-route-in mt-5 max-w-xl text-lg text-fg-2 [text-wrap:balance]">
          Effects, music, sound effects and fonts, each with a preview, a tutorial and its project files. One standard
          style for every edit.
        </p>
        <div className="vh-route-in mt-8 flex flex-col items-center gap-3">
          <Link
            href="/login"
            className="vh-press inline-flex h-11 items-center rounded-full bg-brand px-7 text-base font-medium text-brand-fg hover:opacity-90"
          >
            Sign in to RohTre Vault
          </Link>
          <p className="text-sm text-fg-2">Accounts are created by the admin. There is no public sign-up.</p>
        </div>

        {/* Decorative grid: echoes the library without showing any of it */}
        <div
          aria-hidden="true"
          className="mt-16 grid w-full max-w-5xl grid-cols-2 gap-4 [mask-image:linear-gradient(to_bottom,black_30%,transparent)] sm:grid-cols-3"
        >
          {DECOR.map((k, i) => {
            const Icon = SECTION_ICONS[k];
            return (
              <div key={i} className="flex flex-col gap-2.5 text-left">
                <div className="grid aspect-video place-items-center rounded-[var(--radius-thumb)] bg-[linear-gradient(135deg,var(--ph-a),var(--ph-b))]">
                  <Icon size={28} className={i === 0 ? "text-brand" : "text-fg-2 opacity-60"} />
                </div>
                <div className="h-3 w-4/5 rounded bg-chip" />
                <div className="grid grid-cols-3 gap-1.5">
                  <div className={`h-6 rounded-full ${i === 0 ? "bg-chip-on-bg opacity-80" : "bg-chip"}`} />
                  <div className="h-6 rounded-full bg-chip" />
                  <div className="h-6 rounded-full bg-chip" />
                </div>
              </div>
            );
          })}
        </div>

        <ul className="-mt-6 grid w-full max-w-4xl gap-6 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex flex-col items-center gap-2">
              <span className="grid size-11 place-items-center rounded-full bg-chip">
                <Icon size={20} />
              </span>
              <p className="font-medium">{title}</p>
              <p className="max-w-[16rem] text-sm text-fg-2">{body}</p>
            </li>
          ))}
        </ul>
      </main>

      <footer className="border-t border-line px-6 py-5 text-center text-xs text-fg-2">
        RohTre Vault · For RohTre studio editors only
      </footer>
    </div>
  );
}
