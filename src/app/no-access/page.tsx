import type { Metadata } from "next";
import { LockIcon } from "@/components/icons";

export const metadata: Metadata = { title: "No access" };

export default function NoAccess() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <LockIcon size={48} className="mb-2 text-fg-2" />
      <h1 className="text-2xl font-medium">Your account can’t open the library</h1>
      <p className="max-w-md text-fg-2">
        It has been disabled or has expired. If you think this is a mistake, ask the admin to check your account.
      </p>
      <form action="/auth/signout" method="post">
        <button type="submit" className="mt-3 inline-flex h-9 items-center rounded-full bg-chip px-4 text-sm font-medium hover:bg-chip-hover">
          Sign out
        </button>
      </form>
    </main>
  );
}
