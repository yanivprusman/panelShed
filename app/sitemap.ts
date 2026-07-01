import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Public, indexable pages only. The buy flow (/checkout), admin (/admin) and
 * the feedback board (/feedback-lib-issues) are intentionally excluded and
 * blocked in robots.ts — they hold no SEO value and shouldn't be crawled.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/accessibility`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
