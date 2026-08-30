import ProductDetailClient from "./ProductDetailClient";
import { getProductBySlug } from "@/lib/products/public";

export const dynamic = "force-dynamic";

function getProductLoadErrorType(error) {
  if (error?.code === "PRODUCT_NOT_FOUND") {
    return "not-found";
  }

  return "temporary";
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  let product = null;
  let loadError = "";
  let loadErrorType = "";

  try {
    product = await getProductBySlug(slug, { includeRating: true });
  } catch (error) {
    loadErrorType = getProductLoadErrorType(error);
    loadError =
      loadErrorType === "temporary"
        ? "Please try again."
        : "The product you are looking for is not available.";
  }

  return (
    <ProductDetailClient
      initialProduct={product}
      initialReviewSummary={product?.rating || null}
      initialLoadError={loadError}
      initialLoadErrorType={loadErrorType}
    />
  );
}
