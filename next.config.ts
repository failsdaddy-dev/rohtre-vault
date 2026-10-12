import type { NextConfig } from "next";

// Content Security Policy (production only; `next dev` needs eval for hot reload).
// Allows only this app, Supabase, the Loom embed (R9: no other
// third-party scripts), and Cloudinary for preview files: admin uploads go to
// api.cloudinary.com; clips, stills and music previews come from
// res.cloudinary.com. Inline scripts are needed by Next.js and the theme boot.
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWs = supabase.replace(/^https:/, "wss:");
const CSP = [
  "default-src 'self'",
  // 'wasm-unsafe-eval' + worker-src: the admin's in-browser video tool (ffmpeg.wasm, served from /ffmpeg).
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://res.cloudinary.com",
  "font-src 'self'",
  `connect-src 'self' ${supabase} ${supabaseWs} https://api.cloudinary.com`.trim(),
  "frame-src https://www.loom.com",
  "media-src 'self' blob: https://res.cloudinary.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    // YouTube thumbnails are already small; serve them straight from YouTube.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Internal tool: never indexed, never framed by other sites.
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(isProd ? [{ key: "Content-Security-Policy", value: CSP }] : []),
        ],
      },
    ];
  },
};

export default nextConfig;
