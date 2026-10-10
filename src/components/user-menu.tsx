"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { MAX_AUTOPLAY } from "@/lib/preview-coordinator";
import { updateSettings, useSettings } from "@/lib/settings";
import { useHub } from "./hub-context";
import { AutoplayIcon, LogoutIcon, ShieldIcon } from "./icons";
import { useDismiss } from "./popover";

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center rounded-full bg-[#5c6bc0] text-[13px] font-medium text-white"
    >
      {initials || "?"}
    </span>
  );
}

export function UserMenu() {
  const { user } = useHub();
  const { autoplay } = useSettings();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, box, close);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="vh-press ml-1 grid size-10 place-items-center rounded-full"
      >
        <Avatar name={user.displayName} />
      </button>
      {open && (
        <div
          role="menu"
          className="vh-pop-in absolute right-0 top-12 z-50 w-[300px] origin-top-right overflow-hidden rounded-xl bg-menu py-2 shadow-2xl ring-1 ring-line"
        >
          <div className="flex gap-4 border-b border-line px-4 pb-3 pt-2">
            <Avatar name={user.displayName} size={40} />
            <div className="min-w-0">
              <p className="truncate text-base">{user.displayName}</p>
              <p className="truncate text-sm text-fg-2">{user.email}</p>
              <p className="mt-1 text-xs text-fg-2">{user.role === "admin" ? "Admin" : "Editor"}</p>
            </div>
          </div>
          <div className="py-2">
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={autoplay}
              onClick={() => updateSettings({ autoplay: !autoplay })}
              className="flex w-full items-center gap-4 px-4 py-2 text-left hover:bg-hover"
            >
              <AutoplayIcon />
              <span className="flex-1">
                Autoplay visible previews
                <span className="block text-xs text-fg-2">Up to {MAX_AUTOPLAY} at once. Off: play on hover.</span>
              </span>
              <span
                aria-hidden="true"
                className={`relative h-5 w-9 rounded-full ${autoplay ? "bg-brand" : "bg-chip-hover"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white transition-transform duration-200 ${
                    autoplay ? "translate-x-4" : ""
                  }`}
                />
              </span>
            </button>
            {user.role === "admin" && (
              <Link
                href="/admin"
                role="menuitem"
                onClick={close}
                className="flex items-center gap-4 px-4 py-2 hover:bg-hover"
              >
                <ShieldIcon />
                Admin panel
              </Link>
            )}
            <form action="/auth/signout" method="post">
              <button type="submit" role="menuitem" className="flex w-full items-center gap-4 px-4 py-2 text-left hover:bg-hover">
                <LogoutIcon />
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
