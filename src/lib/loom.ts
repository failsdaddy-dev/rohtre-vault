// Loom share link -> embed URL.
// Loom documents /embed/<id> and the hide_* options:
// https://support.atlassian.com/loom/docs/embed-your-video-into-a-webpage/
// unverified: whether the hide_* options are still honoured (older reports say
// Loom strips them). They are harmless if ignored.

const LOOM = /^https:\/\/(?:www\.)?loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/;

export function loomEmbedUrl(shareUrl: string | null | undefined): string | null {
  if (!shareUrl) return null;
  const m = shareUrl.trim().match(LOOM);
  if (!m) return null;
  const params = new URLSearchParams({ hide_owner: "true", hide_share: "true", hideEmbedTopBar: "true" });
  return `https://www.loom.com/embed/${m[1]}?${params}`;
}
