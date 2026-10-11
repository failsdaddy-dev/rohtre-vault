"use client";

// The three card buttons. Tutorial opens Loom in a modal. Project files and
// Download ask the server for the Mega link only when clicked (R16); a card
// with several links (one per software or file type) shows a small menu.

import { useCallback, useRef, useState } from "react";
import { cardButtons, type ButtonId } from "@/lib/card-buttons";
import { getDataSource } from "@/lib/data-source";
import type { Card, LinkKind, LinkLabel, SectionKind } from "@/lib/types";
import { DownloadIcon, ExternalIcon, FolderIcon, PlayIcon } from "./icons";
import { LoomModal } from "./loom-modal";
import { useDismiss } from "./popover";
import { useToast } from "./toast";

const ICONS: Record<ButtonId, typeof PlayIcon> = {
  tutorial: PlayIcon,
  project: FolderIcon,
  download: DownloadIcon,
  source: ExternalIcon,
};

/** Opens a link fetched asynchronously without tripping popup blockers. */
async function openFetched(fetchUrl: () => Promise<string>) {
  const win = window.open("about:blank", "_blank");
  try {
    const url = await fetchUrl();
    if (win) {
      win.opener = null;
      win.location.href = url;
    } else {
      window.location.href = url;
    }
  } catch (e) {
    win?.close();
    throw e;
  }
}

export function CardActions({
  card,
  kind,
  size = "card",
}: {
  card: Card;
  kind: SectionKind;
  size?: "card" | "page";
}) {
  const toast = useToast();
  const [loom, setLoom] = useState(false);
  const [menu, setMenu] = useState<{ kind: LinkKind; links: LinkLabel[] } | null>(null);
  const [busy, setBusy] = useState<ButtonId | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  useDismiss(!!menu, box, closeMenu);

  const source = getDataSource();
  const buttons = cardButtons(card, kind);

  const openLink = async (link: LinkLabel) => {
    setMenu(null);
    if (!source.linksConnected) {
      toast(`Sample data: “${link.label}” will open its Mega link once links are connected (Stage 6).`);
      return;
    }
    try {
      await openFetched(() => source.openLink(link.id));
    } catch {
      toast("Couldn’t open that link. You may not have access to it any more.");
    }
  };

  const onClick = async (id: ButtonId) => {
    if (id === "tutorial") return setLoom(true);
    if (id === "source") {
      if (card.sourceUrl) window.open(card.sourceUrl, "_blank", "noopener,noreferrer");
      return;
    }
    const linkKind: LinkKind = id === "project" ? "project" : "download";
    if (menu?.kind === linkKind) return setMenu(null);
    setBusy(id);
    try {
      const links = (await source.linkLabels(card.id)).filter((l) => l.kind === linkKind);
      if (links.length === 1) await openLink(links[0]);
      else if (links.length > 1) setMenu({ kind: linkKind, links });
      else toast("No link has been added yet.");
    } finally {
      setBusy(null);
    }
  };

  const page = size === "page";

  return (
    <div ref={box} className="relative">
      <div className={`grid grid-cols-3 ${page ? "gap-2" : "gap-1.5"}`}>
        {buttons.map((b, i) => {
          const Icon = ICONS[b.id];
          const primary = i === 0;
          return (
            <button
              key={b.id}
              type="button"
              disabled={!b.enabled || busy === b.id}
              aria-label={b.enabled ? b.long : `${b.long} (not added yet)`}
              title={b.enabled ? b.long : "Not added yet"}
              aria-haspopup={b.id === "project" || b.id === "download" ? "menu" : undefined}
              aria-expanded={menu?.kind === (b.id === "project" ? "project" : "download") ? true : undefined}
              onClick={() => onClick(b.id)}
              className={`vh-press flex min-w-0 items-center justify-center gap-1.5 rounded-full px-2 font-medium disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${
                page ? "h-10 text-sm" : "h-9 text-[13px]"
              } ${
                primary
                  ? "bg-chip-on-bg text-chip-on-fg enabled:hover:opacity-90"
                  : "bg-chip enabled:hover:bg-chip-hover"
              }`}
            >
              <Icon size={page ? 18 : 16} className="shrink-0" />
              <span className="truncate">{page ? b.long : b.short}</span>
            </button>
          );
        })}
      </div>

      {menu && (
        <div
          role="menu"
          aria-label={menu.kind === "project" ? "Project files" : "Downloads"}
          className={`vh-pop-in absolute top-full z-30 mt-2 w-56 vh-menu ${
            menu.kind === "project" ? "left-1/3 -translate-x-1/4 origin-top" : "right-0 origin-top-right"
          }`}
        >
          {menu.links.map((l) => (
            <button
              key={l.id}
              type="button"
              role="menuitem"
              onClick={() => openLink(l)}
              className="vh-menu-item flex w-full items-center gap-3 text-left text-sm"
            >
              {menu.kind === "project" ? <FolderIcon size={18} /> : <DownloadIcon size={18} />}
              <span className="truncate">{l.label}</span>
            </button>
          ))}
        </div>
      )}

      <LoomModal open={loom} onClose={() => setLoom(false)} title={card.title} loomUrl={card.loomUrl} />
    </div>
  );
}
