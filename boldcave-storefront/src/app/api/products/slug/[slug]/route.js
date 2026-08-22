import connectDB from "@/lib/db";
import { failure, handleRouteError, success } from "@/lib/api/response";
import { serializeProductWithCombos } from "@/lib/api/products";
import { getReviewStats } from "@/lib/orders/pricing";
import { getProductCache, setProductCache } from "@/lib/productCache";
import Product from "@/models/Product";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  try {
    const { slug } = await params;
    const cleanSlug = String(slug || "").trim().toLowerCase();

    if (!cleanSlug) {
      return failure("INVALID_SLUG", "Invalid product slug", 400);
    }

    const cacheKey = `product-slug:${cleanSlug}`;
    const cached = getProductCache(cacheKey);
    if (cached) {
      return success(cached);
    }

    await connectDB();
    const product = await Product.findOne({ slug: cleanSlug, status: "published" });

    if (!product) {
      return failure("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    const data = await serializeProductWithCombos(product);
    data.rating = await getReviewStats(product._id);

    return success(setProductCache(cacheKey, { product: data }));
  } catch (error) {
    return handleRouteError(error);
  }
}
