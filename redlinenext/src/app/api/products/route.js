import connectDB from "@/lib/db";
import { failure, handleRouteError, success } from "@/lib/api/response";
import { serializeProduct } from "@/lib/api/products";
import { getReviewStats } from "@/lib/orders/pricing";
import { validateCategory } from "@/lib/validation";
import Product from "@/models/Product";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    if (category && !validateCategory(category)) {
      return failure("INVALID_CATEGORY", "Invalid product category", 400);
    }

    const filter = { status: "published" };
    if (category === "Men" || category === "Women") {
      filter.$or = [
        { audienceTags: category },
        { audienceTags: "Unisex" },
        { audienceTags: { $exists: false }, category },
        { audienceTags: { $size: 0 }, category },
        { audienceTags: { $exists: false }, category: "Unisex" },
        { audienceTags: { $size: 0 }, category: "Unisex" },
      ];
    } else if (category === "Unisex") {
      filter.$or = [
        { audienceTags: "Unisex" },
        { audienceTags: { $exists: false }, category: "Unisex" },
        { audienceTags: { $size: 0 }, category: "Unisex" },
      ];
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    const data = await Promise.all(
      products.map(async (product) => {
        const serialized = serializeProduct(product);
        serialized.rating = await getReviewStats(product._id);
        return serialized;
      })
    );

    return success({ products: data });
  } catch (error) {
    return handleRouteError(error);
  }
}
