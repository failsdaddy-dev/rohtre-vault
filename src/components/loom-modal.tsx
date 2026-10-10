"use client";

import { loomEmbedUrl } from "@/lib/loom";
import { Modal } from "./modal";

export function LoomModal({
  open,
  onClose,
  title,
  loomUrl,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  loomUrl: string | null;
}) {
  const src = loomEmbedUrl(loomUrl);
  return (
    <Modal open={open} onClose={onClose} title={`Tutorial: ${title}`} wide>
      <div className="px-5 pb-5">
        {src ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
            <iframe
              src={src}
              title={`Tutorial: ${title}`}
              allow="fullscreen; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        ) : (
          <p className="py-10 text-center text-fg-2">This tutorial link isn’t a Loom share link.</p>
        )}
      </div>
    </Modal>
  );
}
