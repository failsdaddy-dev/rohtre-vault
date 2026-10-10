import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-medium">This page isn’t available</h1>
      <p className="text-fg-2">Check the link, or go back to the library.</p>
      <Link href="/effects" className="mt-3 inline-flex h-9 items-center rounded-full bg-chip px-4 text-sm font-medium hover:bg-chip-hover">
        Go to Effects
      </Link>
    </main>
  );
}
