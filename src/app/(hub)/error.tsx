"use client";

import { MessageState } from "@/components/states";

export default function HubError({ reset }: { error: Error; reset: () => void }) {
  return (
    <MessageState
      title="Something went wrong"
      body="This page couldn’t load. Try again, and tell the admin if it keeps happening."
      action={
        <button type="button" onClick={reset} className="vh-press h-9 rounded-full bg-chip px-4 text-sm font-medium hover:bg-chip-hover">
          Try again
        </button>
      }
    />
  );
}
