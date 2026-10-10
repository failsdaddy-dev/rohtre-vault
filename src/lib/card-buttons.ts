// Which three buttons a card shows, and whether each is usable (R2, R4).
// Pure logic so it can be unit-tested.

import type { Card, SectionKind } from "./types";

export type ButtonId = "tutorial" | "project" | "download" | "source";

export interface CardButton {
  id: ButtonId;
  /** Short label for grid cards. */
  short: string;
  /** Full label for the card page and screen readers. */
  long: string;
  enabled: boolean;
}

const DOWNLOAD_LABEL: Record<SectionKind, string> = {
  effect: "Download video",
  text: "Download",
  font: "Download font",
  music: "Download audio",
  sound: "Download audio",
};

export function cardButtons(card: Card, kind: SectionKind): [CardButton, CardButton, CardButton] {
  const tutorial: CardButton = { id: "tutorial", short: "Tutorial", long: "Tutorial", enabled: !!card.loomUrl };
  const download: CardButton = {
    id: "download",
    short: "Download",
    long: DOWNLOAD_LABEL[kind],
    enabled: card.hasDownloads,
  };
  if (kind === "music") {
    // Phase 0, Q8: the "application" button opens the track on its platform.
    return [
      tutorial,
      { id: "source", short: "Open on platform", long: "Open on platform", enabled: !!card.sourceUrl },
      download,
    ];
  }
  return [
    tutorial,
    { id: "project", short: "Project files", long: "Project files", enabled: card.hasProjectFiles },
    download,
  ];
}
