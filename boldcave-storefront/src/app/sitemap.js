import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { getPublishedProductSitemapEntries } from "@/lib/products/public";
import { canonicalUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const staticRoutes = [
  "/",
  "/collection",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/shipping",
  "/returns",
];

export default async function sitemap() {
  let products = [];

  try {
    products = await withRuntimeDatabase(() =>
      getPublishedProductSitemapEntries()
    );
  } catch {
    products = [];
  }

  return [
    ...staticRoutes.map((route) => ({
      url: canonicalUrl(route),
    })),
    ...products.map((product) => ({
      url: canonicalUrl(`/product/${product.slug}`),
      ...(product.updatedAt
        ? { lastModified: new Date(product.updatedAt) }
        : {}),
    })),
  ];
}
