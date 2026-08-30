import { failure, handleRouteError, success } from "@/lib/api/response";
import { publicBrowseCacheHeaders } from "@/lib/api/response";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { getProductBySlug } from "@/lib/products/public";

export const runtime = "nodejs";

export async function GET(_request, context) {
  return withRuntimeDatabase(() => getProductBySlugRoute(_request, context));
}

async function getProductBySlugRoute(_request, { params }) {
  try {
    const { slug } = await params;
    const cleanSlug = String(slug || "").trim().toLowerCase();

    if (!cleanSlug) {
      return failure("INVALID_SLUG", "Invalid product slug", 400);
    }

    const product = await getProductBySlug(cleanSlug, { includeRating: true });
    if (!product) {
      return failure("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    return success({ product }, 200, { headers: publicBrowseCacheHeaders });
  } catch (error) {
    return handleRouteError(error);
  }
}
