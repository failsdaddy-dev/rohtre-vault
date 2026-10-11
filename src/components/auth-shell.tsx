import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { VaultLogo } from "./icons";
import { ThemeToggle, Wordmark } from "./top-bar";

// Frame for the pages people see outside the library: sign in, no access,
// page not found. A red striped brand panel on one side (a band on phones)
// and the content in a card that sits on a red offset block.

const COLUMNS = 6;

function StripePanel({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`overflow-hidden ${className}`}>
      <div className="absolute inset-0 flex">
        {Array.from({ length: COLUMNS }, (_, i) => (
          <div
            key={i}
            style={{ "--i": i } as CSSProperties}
            className="vh-panel-col vh-stripes h-full flex-1 border-r border-[var(--intro-line)] last:border-r-0"
          />
        ))}
      </div>
    </div>
  );
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Brand panel */}
      <div className="relative hidden lg:block">
        <StripePanel className="absolute inset-0" />
        <div className="vh-panel-text relative flex h-full flex-col justify-between p-10 text-[var(--intro-fg)]">
          <Link href="/" className="w-fit rounded-md">
            <Wordmark />
          </Link>
          <div>
            <VaultLogo size={72} />
            <p className="mt-6 text-[clamp(2.5rem,4.2vw,4rem)] font-bold leading-[0.95] tracking-[-0.04em]">
              ROHTRE
              <br />
              VAULT
            </p>
            <p className="mt-4 max-w-sm text-base opacity-80">
              Every approved effect, music track, sound and font, in one private library.
            </p>
          </div>
          <p className="text-xs opacity-70">For RohTre studio editors only</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex min-h-screen flex-col">
        <StripePanel className="relative h-24 lg:hidden" />
        <header className="flex items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="rounded-md lg:invisible">
            <Wordmark />
          </Link>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center px-5 pb-16 pt-4 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

/** The card the form or message sits in. */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="vh-offset vh-pop-in w-full max-w-[420px] rounded-[24px] p-8 [--offset-surface:var(--bg-elev)] max-sm:p-6">
      {children}
    </div>
  );
}
