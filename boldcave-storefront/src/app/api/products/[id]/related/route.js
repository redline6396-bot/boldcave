import connectDB from "@/lib/db";
import { failure, handleRouteError, success } from "@/lib/api/response";
import { serializeProduct } from "@/lib/api/products";
import { getReviewStats } from "@/lib/orders/pricing";
import { isObjectId } from "@/lib/validation";
import Product from "@/models/Product";

export const runtime = "nodejs";

const RELATED_LIMIT = 4;

async function serializeProductsWithRatings(products) {
  return Promise.all(
    products.map(async (product) => {
      const serialized = serializeProduct(product);
      serialized.rating = await getReviewStats(product._id);
      return serialized;
    })
  );
}

export async function GET(_request, { params }) {
  try {
    const { id } = await params;

    if (!isObjectId(id)) {
      return failure("INVALID_PRODUCT_ID", "Invalid product id", 400);
    }

    await connectDB();

    const currentProduct = await Product.findOne({
      _id: id,
      status: "published",
    });

    if (!currentProduct) {
      return failure("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    const relatedProducts = await Product.aggregate([
      {
        $match: {
          _id: { $ne: currentProduct._id },
          status: "published",
        },
      },
      { $sample: { size: RELATED_LIMIT } },
    ]);

    const products = await serializeProductsWithRatings(relatedProducts);

    return success({ products });
  } catch (error) {
    return handleRouteError(error);
  }
}
