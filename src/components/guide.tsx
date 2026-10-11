"use client";

// Left guide: 240px full, 72px mini, or a slide-in drawer on small screens (R21, R25).

import Link from "next/link";
import { useEffect, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { useCurrentSection } from "@/lib/use-browse-url";
import { ActiveFilterList, ActiveFiltersTab } from "./active-filters";
import { useHub } from "./hub-context";
import { MenuIcon, SECTION_ICONS, ShieldIcon } from "./icons";
import { IconButton, Wordmark } from "./top-bar";

function SectionLinks({ mini, onNavigate }: { mini: boolean; onNavigate?: () => void }) {
  const { sections } = useHub();
  const current = useCurrentSection();
  return (
    <nav aria-label="Sections" className="flex flex-col gap-0.5">
      {sections.map((s, i) => {
        const Icon = SECTION_ICONS[s.kind];
        const active = current === s.slug;
        return (
          <Link
            key={s.slug}
            href={`/${s.slug}`}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            style={{ "--i": i } as CSSProperties}
            className={
              mini
                ? `vh-nav flex flex-col items-center gap-1.5 rounded-[10px] py-4 text-[10px] hover:bg-hover ${active ? "font-medium" : ""}`
                : `vh-nav flex h-10 items-center gap-6 rounded-[10px] px-3 text-sm hover:bg-hover ${
                    active ? "bg-chip font-medium hover:bg-chip-hover" : ""
                  }`
            }
          >
            <Icon />
            <span className={mini ? "max-w-full truncate px-1" : "truncate"}>{s.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function AdminLink({ mini, onNavigate }: { mini: boolean; onNavigate?: () => void }) {
  const { user } = useHub();
  const pathname = usePathname();
  if (user.role !== "admin") return null;
  const active = pathname === "/admin" || pathname.startsWith("/admin/");
  return (
    <Link
      href="/admin"
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      style={{ "--i": 7 } as CSSProperties}
      className={
        mini
          ? `vh-nav flex flex-col items-center gap-1.5 rounded-[10px] py-4 text-[10px] hover:bg-hover ${active ? "font-medium" : ""}`
          : `vh-nav flex h-10 items-center gap-6 rounded-[10px] px-3 text-sm hover:bg-hover ${active ? "bg-chip font-medium hover:bg-chip-hover" : ""}`
      }
    >
      <ShieldIcon />
      <span>Admin</span>
    </Link>
  );
}

function FullGuideBody({ onNavigate, inline }: { onNavigate?: () => void; inline?: boolean }) {
  return (
    <div className="flex flex-col px-3 pb-6 pt-3">
      <SectionLinks mini={false} onNavigate={onNavigate} />
      <hr className="my-3 border-line" />
      {inline ? (
        // Touch drawer: no hover, so the list is shown in place.
        <div>
          <p className="px-3 pb-2 text-base font-medium">Active filters</p>
          <ActiveFilterList />
        </div>
      ) : (
        <ActiveFiltersTab mini={false} />
      )}
      <hr className="my-3 border-line" />
      <AdminLink mini={false} onNavigate={onNavigate} />
    </div>
  );
}

export function Guide() {
  const { guideMode, drawerOpen, setDrawerOpen, toggleGuide } = useHub();
  const pathname = usePathname();

  // Close the drawer after navigation.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname, setDrawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen, setDrawerOpen]);

  return (
    <>
      {guideMode === "full" && (
        <aside
          aria-label="Guide"
          className="vh-fade-in fixed bottom-0 left-0 top-14 z-30 w-[var(--guide-full)] overflow-y-auto overscroll-contain bg-bg [scrollbar-width:thin]"
        >
          <FullGuideBody />
        </aside>
      )}
      {guideMode === "mini" && (
        <aside
          aria-label="Guide"
          className="vh-fade-in fixed bottom-0 left-0 top-14 z-30 flex w-[var(--guide-mini)] flex-col gap-0.5 bg-bg px-1 pt-1"
        >
          <SectionLinks mini />
          <ActiveFiltersTab mini />
          <AdminLink mini />
        </aside>
      )}

      {/* Drawer (narrow screens, or mini mode's hamburger). Always mounted so it can animate. */}
      <div className={`fixed inset-0 z-50 ${drawerOpen ? "" : "pointer-events-none"}`} aria-hidden={!drawerOpen}>
        <div
          onClick={() => setDrawerOpen(false)}
          className={`absolute inset-0 bg-[var(--overlay)] transition-opacity duration-[var(--dur-3)] ${
            drawerOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          aria-label="Guide"
          inert={!drawerOpen}
          className={`absolute inset-y-0 left-0 w-[var(--guide-full)] overflow-y-auto bg-bg shadow-2xl transition-transform duration-[var(--dur-3)] ease-[var(--ease)] ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-14 items-center gap-2 px-4">
            <IconButton label="Close menu" onClick={toggleGuide}>
              <MenuIcon />
            </IconButton>
            <Link href="/effects" className="rounded-md px-2 py-1">
              <Wordmark />
            </Link>
          </div>
          <FullGuideBody inline onNavigate={() => setDrawerOpen(false)} />
        </aside>
      </div>
    </>
  );
}
