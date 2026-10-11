"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useBrowseUrl } from "@/lib/use-browse-url";
import { updateSettings, useSettings } from "@/lib/settings";
import { useHub } from "./hub-context";
import { BackIcon, CloseIcon, MenuIcon, MoonIcon, SearchIcon, SunIcon, VaultLogo } from "./icons";
import { UserMenu } from "./user-menu";

export function Wordmark() {
  return (
    <span className="flex items-center gap-2 select-none">
      <VaultLogo size={30} />
      <span className="text-[19px] font-semibold tracking-[-0.03em]">
        RohTre <span className="font-light">Vault</span>
      </span>
    </span>
  );
}

/** Dark/light switch: the knob slides (transform only) and carries the current mode's icon. */
export function ThemeToggle() {
  const { theme } = useSettings();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark theme"
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => updateSettings({ theme: dark ? "light" : "dark" })}
      className="relative mx-1 flex h-8 w-[60px] shrink-0 items-center justify-between rounded-full bg-chip px-2 text-fg-2 hover:bg-chip-hover"
    >
      <SunIcon size={15} />
      <MoonIcon size={15} />
      <span
        aria-hidden="true"
        className={`absolute left-1 top-1 grid size-6 place-items-center rounded-full bg-brand text-brand-fg shadow transition-transform duration-[var(--dur-2)] ease-[var(--ease)] ${
          dark ? "translate-x-7" : "translate-x-0"
        }`}
      >
        {dark ? <MoonIcon size={14} /> : <SunIcon size={14} />}
      </span>
    </button>
  );
}

export function IconButton({
  label,
  onClick,
  children,
  className = "",
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`vh-press no-lift grid size-10 shrink-0 place-items-center rounded-full hover:bg-hover active:bg-press ${className}`}
    >
      {children}
    </button>
  );
}

function SearchForm({ autoFocus, onDone }: { autoFocus?: boolean; onDone?: () => void }) {
  const { state, go, section } = useBrowseUrl();
  const [value, setValue] = useState(state.q);
  const input = useRef<HTMLInputElement>(null);

  // Keep the box in step with the URL (back/forward, chip clicks).
  const [syncedQ, setSyncedQ] = useState(state.q);
  if (syncedQ !== state.q) {
    setSyncedQ(state.q);
    setValue(state.q);
  }
  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    go({ q: value }, { toSection: section });
    input.current?.blur();
    onDone?.();
  };

  return (
    <form
      role="search"
      onSubmit={submit}
      className="vh-field group flex h-10 w-full max-w-[640px] items-center overflow-hidden rounded-full border border-[var(--search-border)] bg-[var(--search-bg)]"
    >
      <div className="flex h-full min-w-0 flex-1 items-center pl-4">
        <SearchIcon size={18} className="mr-2 hidden shrink-0 text-fg-2 group-focus-within:block" />
        <input
          ref={input}
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search effects, music, fonts…"
          aria-label="Search"
          maxLength={200}
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-fg-2 [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setValue("");
              input.current?.focus();
            }}
            className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-hover"
          >
            <CloseIcon size={20} />
          </button>
        )}
      </div>
      <button
        type="submit"
        aria-label="Search"
        title="Search"
        className="grid h-full w-16 shrink-0 place-items-center border-l border-[var(--search-border)] bg-[var(--search-btn)] transition-colors duration-[var(--dur-1)] hover:bg-chip-hover"
      >
        <SearchIcon size={22} />
      </button>
    </form>
  );
}

export function TopBar() {
  const { toggleGuide } = useHub();
  const [mobileSearch, setMobileSearch] = useState(false);

  if (mobileSearch) {
    return (
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 bg-bg px-2">
        <IconButton label="Back" onClick={() => setMobileSearch(false)}>
          <BackIcon />
        </IconButton>
        <SearchForm autoFocus onDone={() => setMobileSearch(false)} />
      </header>
    );
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between gap-4 bg-bg px-4 max-sm:px-2">
      <div className="flex shrink-0 items-center gap-2">
        <IconButton label="Menu" onClick={toggleGuide}>
          <MenuIcon />
        </IconButton>
        <Link href="/effects" aria-label="RohTre Vault home" className="rounded-md px-2 py-1">
          <Wordmark />
        </Link>
      </div>

      <div className="hidden min-w-0 flex-1 justify-center sm:flex">
        <SearchForm />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <IconButton label="Search" onClick={() => setMobileSearch(true)} className="sm:hidden">
          <SearchIcon />
        </IconButton>
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
