"use client";

// Reads and writes the browse state in the URL so every view is shareable and
// back/forward works (R8). Each filter change is a history entry.

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildHref, parseUrlState, toggleFilter, type UrlState } from "./url-state";

export function useCurrentSection(): string | null {
  const pathname = usePathname();
  const seg = pathname.split("/")[1];
  return seg && seg !== "login" && seg !== "admin" && seg !== "no-access" ? seg : null;
}

export function useBrowseUrl(sectionOverride?: string) {
  const router = useRouter();
  const params = useSearchParams();
  const current = useCurrentSection();
  const section = sectionOverride ?? current ?? "effects";
  const state = useMemo(() => parseUrlState(params), [params]);

  const go = useCallback(
    (next: Partial<UrlState>, opts: { replace?: boolean; toSection?: string } = {}) => {
      const merged = { ...state, ...next };
      // Changing the search resets the "relevance" default unless chosen.
      if (next.q !== undefined && next.sort === undefined) merged.sort = next.q ? "relevance" : "newest";
      const href = buildHref(opts.toSection ?? section, merged);
      if (opts.replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [router, section, state],
  );

  return {
    section,
    state,
    go,
    toggle: (slug: string) => go({ filters: toggleFilter(state.filters, slug) }),
    remove: (slug: string) => go({ filters: state.filters.filter((f) => f !== slug) }),
    clearFilters: () => go({ filters: [] }),
  };
}
