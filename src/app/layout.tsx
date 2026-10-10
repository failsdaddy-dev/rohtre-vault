import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { THEME_BOOT_SCRIPT } from "@/lib/theme-boot";
import "./globals.css";

// Outfit is licensed under the SIL Open Font License 1.1. next/font downloads
// it at build time and serves it from this app, so browsers make no request
// to Google. verified: https://github.com/google/fonts/blob/main/ofl/outfit/OFL.txt
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "RohTre Vault", template: "%s · RohTre Vault" },
  description: "Internal library of approved effects, music, sound effects and fonts.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export const viewport: Viewport = {
  themeColor: "#0f0f0f",
  colorScheme: "dark light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" className={outfit.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
