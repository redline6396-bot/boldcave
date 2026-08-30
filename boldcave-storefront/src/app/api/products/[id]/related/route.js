import { failure, handleRouteError, success } from "@/lib/api/response";
import { publicBrowseCacheHeaders } from "@/lib/api/response";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { getRelatedCatalogProducts } from "@/lib/products/public";
import { isObjectId } from "@/lib/validation";

export const runtime = "nodejs";

const RELATED_LIMIT = 4;

export async function GET(_request, context) {
  return withRuntimeDatabase(() => getRelatedProductsRoute(_request, context));
}

async function getRelatedProductsRoute(_request, { params }) {
  try {
    const { id } = await params;

    if (!isObjectId(id)) {
      return failure("INVALID_PRODUCT_ID", "Invalid product id", 400);
    }

    const products = await getRelatedCatalogProducts(id, RELATED_LIMIT);

    return success({ products }, 200, { headers: publicBrowseCacheHeaders });
  } catch (error) {
    if (error?.code === "PRODUCT_NOT_FOUND") {
      return failure("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    return handleRouteError(error);
  }
}
