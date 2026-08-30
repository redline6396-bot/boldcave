import connectDB from "@/lib/db";
import { failure, handleRouteError, success } from "@/lib/api/response";
import { publicBrowseCacheHeaders } from "@/lib/api/response";
import { serializeProductWithCombos } from "@/lib/api/products";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { getReviewStats } from "@/lib/orders/pricing";
import { isObjectId } from "@/lib/validation";
import Product from "@/models/Product";

export const runtime = "nodejs";

export async function GET(_request, context) {
  return withRuntimeDatabase(() => getProductRoute(_request, context));
}

async function getProductRoute(_request, { params }) {
  try {
    const { id } = await params;

    if (!isObjectId(id)) {
      return failure("INVALID_PRODUCT_ID", "Invalid product id", 400);
    }

    await connectDB();
    const product = await Product.findOne({ _id: id, status: "published" });

    if (!product) {
      return failure("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    const data = await serializeProductWithCombos(product);
    data.rating = await getReviewStats(product._id);

    return success({ product: data }, 200, { headers: publicBrowseCacheHeaders });
  } catch (error) {
    return handleRouteError(error);
  }
}
