import connectDB from "@/lib/db";
import { failure, handleRouteError, success } from "@/lib/api/response";
import { serializeProduct } from "@/lib/api/products";
import { getReviewStats } from "@/lib/orders/pricing";
import { getProductCache, setProductCache } from "@/lib/productCache";
import { PRODUCT_CATEGORIES } from "@/lib/validation";
import Product from "@/models/Product";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const cacheKey = `product-list:${category || "all"}`;

    if (category && !PRODUCT_CATEGORIES.includes(category)) {
      return failure("INVALID_CATEGORY", "Invalid product category", 400);
    }

    const cached = getProductCache(cacheKey);
    if (cached) {
      return success(cached);
    }

    const filter = { status: "published" };
    if (category === "Men" || category === "Women") {
      filter.audienceTags = { $in: [category, "Unisex"] };
    } else if (category === "Unisex") {
      filter.audienceTags = "Unisex";
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    const data = await Promise.all(
      products.map(async (product) => {
        const serialized = serializeProduct(product);
        serialized.rating = await getReviewStats(product._id);
        return serialized;
      })
    );

    return success(setProductCache(cacheKey, { products: data }));
  } catch (error) {
    return handleRouteError(error);
  }
}
