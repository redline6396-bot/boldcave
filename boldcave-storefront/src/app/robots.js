import { SITE_URL } from "@/lib/seo";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/collection",
        "/product/",
        "/about",
        "/contact",
        "/privacy",
        "/terms",
        "/shipping",
        "/returns",
      ],
      disallow: [
        "/api/",
        "/admin/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
