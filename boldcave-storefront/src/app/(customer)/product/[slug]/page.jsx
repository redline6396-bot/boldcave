import ProductDetailClient from "./ProductDetailClient";
import { getProductBySlug } from "@/lib/products/public";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }) {
  const { slug } = await params;
  let product = null;
  let loadError = "";

  try {
    product = await getProductBySlug(slug, { includeRating: true });
  } catch (error) {
    loadError = error?.message || "Product not found";
  }

  return (
    <ProductDetailClient
      initialProduct={product}
      initialReviewSummary={product?.rating || null}
      initialLoadError={loadError}
    />
  );
}
