"use client";

// Shared app data for the signed-in area: sections, filters, current user,
// and the shell's layout state (guide expanded/mini, drawer open).

import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CurrentUser, Filter, FilterGroup, Section } from "@/lib/types";

export type GuideMode = "full" | "mini" | "none";

interface HubValue {
  sections: Section[];
  groups: FilterGroup[];
  filters: Filter[];
  filterBySlug: Map<string, Filter>;
  user: CurrentUser;
  guideMode: GuideMode;
  /** Wide screens: user's choice of full vs mini guide. */
  toggleGuide: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}

const HubContext = createContext<HubValue | null>(null);

// YouTube-like breakpoints: full guide >= 1312px, mini guide >= 792px, else none.
const WIDE = "(min-width: 1312px)";
const MEDIUM = "(min-width: 792px)";

function useMedia(query: string, fallback: boolean) {
  const [match, setMatch] = useState(fallback);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}

export function HubProvider({
  sections,
  groups,
  filters,
  user,
  children,
}: {
  sections: Section[];
  groups: FilterGroup[];
  filters: Filter[];
  user: CurrentUser;
  children: ReactNode;
}) {
  const wide = useMedia(WIDE, true);
  const medium = useMedia(MEDIUM, true);
  const [preferMini, setPreferMini] = useState(false);
  const [drawerState, setDrawerOpenState] = useState(false);
  // The drawer only exists below the wide breakpoint.
  const drawerOpen = drawerState && !wide;

  const guideMode: GuideMode = wide ? (preferMini ? "mini" : "full") : medium ? "mini" : "none";

  const toggleGuide = useCallback(() => {
    if (window.matchMedia(WIDE).matches) setPreferMini((v) => !v);
    else setDrawerOpenState((v) => !v);
  }, []);

  const setDrawerOpen = useCallback((open: boolean) => setDrawerOpenState(open), []);

  const value = useMemo<HubValue>(
    () => ({
      sections,
      groups,
      filters,
      filterBySlug: new Map(filters.map((f) => [f.slug, f])),
      user,
      guideMode,
      toggleGuide,
      drawerOpen,
      setDrawerOpen,
    }),
    [sections, groups, filters, user, guideMode, toggleGuide, drawerOpen, setDrawerOpen],
  );

  return <HubContext value={value}>{children}</HubContext>;
}

export function useHub(): HubValue {
  const v = use(HubContext);
  if (!v) throw new Error("useHub must be used inside HubProvider");
  return v;
}
