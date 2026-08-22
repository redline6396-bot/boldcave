import connectDB from "@/lib/db";
import { failure, handleRouteError, success } from "@/lib/api/response";
import { getReviewStats } from "@/lib/orders/pricing";
import { isObjectId } from "@/lib/validation";
import Review from "@/models/Review";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  try {
    const { productId } = await params;

    if (!isObjectId(productId)) {
      return failure("INVALID_PRODUCT_ID", "Invalid product id", 400);
    }

    await connectDB();
    const reviews = await Review.find({ product: productId, approved: true })
      .populate("user", "firstName lastName")
      .sort({ createdAt: -1 });

    const stats = await getReviewStats(reviews[0]?.product || productId);

    return success({
      reviews: reviews.map((review) => ({
        id: String(review._id),
        rating: review.rating,
        title: review.title || "",
        text: review.text,
        photos: review.photos || [],
        verifiedPurchase: review.verifiedPurchase,
        user: {
          firstName: review.user?.firstName || "Customer",
          lastName: review.user?.lastName || "",
        },
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      })),
      rating: stats,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
