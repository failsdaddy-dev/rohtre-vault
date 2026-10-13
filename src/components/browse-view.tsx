"use client";

// The card grid for one section: filters and search from the URL, infinite
// scroll with a cursor, skeletons, and empty/error states (R21).

import { useCallback, useEffect, useRef, useState } from "react";
import { getDataSource, matchesFilters, searchScore } from "@/lib/data-source";
import type { Card, Cursor, Section } from "@/lib/types";
import { useBrowseUrl } from "@/lib/use-browse-url";
import { useCardSaved } from "./card-edit";
import { ChipBar } from "./chip-bar";
import { useHub } from "./hub-context";
import { SearchIcon, TuneIcon } from "./icons";
import { CardSkeleton, GRID_CLASS, GridSkeleton, MessageState } from "./states";
import { VideoCard } from "./video-card";

type Status = "loading" | "ready" | "error";

export function BrowseView({ section }: { section: Section }) {
  const { state, go, clearFilters } = useBrowseUrl(section.slug);
  const [items, setItems] = useState<Card[]>([]);
  const [next, setNext] = useState<Cursor | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const request = useRef(0);
  const sentinel = useRef<HTMLDivElement>(null);

  const [attempt, setAttempt] = useState(0);
  const key = `${section.slug}|${state.filters.join(",")}|${state.q}|${state.sort}|${attempt}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  // A new query resets the list immediately (render-time reset, no flash of old cards).
  if (loadedKey !== key) {
    setLoadedKey(key);
    setStatus("loading");
    setItems([]);
    setNext(null);
  }

  useEffect(() => {
    const id = ++request.current;
    getDataSource()
      .browse({ section: section.slug, filters: state.filters, q: state.q, sort: state.sort })
      .then((page) => {
        if (id !== request.current) return;
        setItems(page.items);
        setNext(page.next);
        setStatus("ready");
      })
      .catch(() => id === request.current && setStatus("error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures the query
  }, [key]);

  useEffect(() => {
    let live = true;
    getDataSource()
      .filterCounts(section.slug)
      .then((c) => live && setCounts(c))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [section.slug]);

  const loadMore = useCallback(() => {
    if (!next || loadingMore || status !== "ready") return;
    const id = request.current;
    setLoadingMore(true);
    getDataSource()
      .browse({ section: section.slug, filters: state.filters, q: state.q, sort: state.sort }, next)
      .then((page) => {
        if (id !== request.current) return;
        setItems((prev) => [...prev, ...page.items]);
        setNext(page.next);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [next, loadingMore, status, section.slug, state.filters, state.q, state.sort]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !next) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), {
      rootMargin: "800px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [next, loadMore]);

  const retry = () => setAttempt((a) => a + 1);

  // Admin saved a card from the Edit drawer: refresh just that card in place
  // (same fields as the list), or take it out if it no longer belongs in
  // this view. Filters, search, URL and scroll position stay as they are.
  const { filters } = useHub();
  useCardSaved(async (saved) => {
    if (!items.some((c) => c.id === saved.id)) return;
    const fresh =
      saved.status === "published" && saved.sectionSlug === section.slug
        ? await getDataSource().card(saved.sectionSlug, saved.slug)
        : null;
    const fits = !!fresh && matchesFilters(fresh, state.filters, filters) && (!state.q || searchScore(fresh, state.q, filters) > 0);
    setItems((prev) => (fits ? prev.map((c) => (c.id === saved.id ? fresh! : c)) : prev.filter((c) => c.id !== saved.id)));
    if (fits) return "Saved";
    if (saved.status !== "published") return "Saved as a draft. Drafts don’t show in the grid.";
    return "Saved. This card no longer matches the current filters.";
  });

  return (
    <div className="px-6 max-sm:px-0">
      <div className="max-sm:px-3">
        <ChipBar counts={counts} />
      </div>

      {state.q && status !== "loading" && (
        <p className="pb-4 pt-1 text-sm text-fg-2 max-sm:px-3">
          {items.length === 0 ? "No results" : `Results for “${state.q}”`}
          {state.filters.length > 0 && ` with ${state.filters.length} filter${state.filters.length > 1 ? "s" : ""}`}
        </p>
      )}

      <div className="pt-3 pb-12">
        {status === "loading" && <GridSkeleton />}

        {status === "error" && (
          <MessageState
            title="Couldn’t load this section"
            body="Check your connection and try again."
            action={
              <button type="button" onClick={retry} className="vh-press h-9 rounded-full bg-chip px-4 text-sm font-medium hover:bg-chip-hover">
                Try again
              </button>
            }
          />
        )}

        {status === "ready" && items.length === 0 && (
          <MessageState
            icon={state.q ? <SearchIcon size={48} /> : <TuneIcon size={48} />}
            title={state.q ? `Nothing matches “${state.q}”` : `No ${section.name.toLowerCase()} match these filters`}
            body={
              state.filters.length
                ? "Every selected filter group must match. Try removing a filter."
                : "Try a shorter or different word."
            }
            action={
              <div className="flex gap-2">
                {state.filters.length > 0 && (
                  <button type="button" onClick={clearFilters} className="vh-press h-9 rounded-full bg-chip px-4 text-sm font-medium hover:bg-chip-hover">
                    Clear filters
                  </button>
                )}
                {state.q && (
                  <button type="button" onClick={() => go({ q: "" })} className="vh-press h-9 rounded-full bg-chip px-4 text-sm font-medium hover:bg-chip-hover">
                    Clear search
                  </button>
                )}
              </div>
            }
          />
        )}

        {status === "ready" && items.length > 0 && (
          <div className={GRID_CLASS}>
            {items.map((c) => (
              <VideoCard key={c.id} card={c} kind={section.kind} />
            ))}
            {loadingMore && Array.from({ length: 4 }, (_, i) => <CardSkeleton key={`s${i}`} />)}
          </div>
        )}
        <div ref={sentinel} aria-hidden="true" className="h-px" />
      </div>
    </div>
  );
}
