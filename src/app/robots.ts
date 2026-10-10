import type { MetadataRoute } from "next";

// Internal tool: ask every crawler to stay out (also sent as X-Robots-Tag).
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
