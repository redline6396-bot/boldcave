import { failure, handleRouteError, success } from "@/lib/api/response";
import { publicBrowseCacheHeaders } from "@/lib/api/response";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { getCatalogProducts, normalizeCatalogCategory } from "@/lib/products/public";

export const runtime = "nodejs";

export async function GET(request) {
  return withRuntimeDatabase(() => getProductsRoute(request));
}

async function getProductsRoute(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const normalizedCategory = normalizeCatalogCategory(category);
    const idsParam = searchParams.get("ids");
    const ids = idsParam
      ? idsParam
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      : undefined;

    if (normalizedCategory === null) {
      return failure("INVALID_CATEGORY", "Invalid product category", 400);
    }

    const products = await getCatalogProducts({
      category: normalizedCategory || "",
      ids,
    });

    return success({ products }, 200, { headers: publicBrowseCacheHeaders });
  } catch (error) {
    if (error?.code === "INVALID_PRODUCT_ID") {
      return failure("INVALID_PRODUCT_ID", "Invalid product id", 400);
    }

    return handleRouteError(error);
  }
}
