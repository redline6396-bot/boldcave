import connectDB from "@/lib/db";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { hasVerifiedPurchase } from "@/lib/orders/pricing";
import { cleanString, isObjectId, toPositiveInteger } from "@/lib/validation";
import Product from "@/models/Product";
import Review from "@/models/Review";

export const runtime = "nodejs";

export async function GET(request) {
  return withRuntimeDatabase(() => getReviewRoute(request));
}

async function getReviewRoute(request) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId") || "";

    if (!isObjectId(productId)) {
      return failure("INVALID_PRODUCT_ID", "Invalid product id", 400);
    }

    await connectDB();
    const review = await Review.findOne({ product: productId, user: auth.user._id });

    return success({
      review: review
        ? {
            id: String(review._id),
            product: String(review.product),
            rating: review.rating,
            title: review.title || "",
            text: review.text,
            photos: review.photos || [],
            approved: review.approved,
            verifiedPurchase: review.verifiedPurchase,
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
          }
        : null,
    });
  } catch (error) {
    return handleRouteError(error, "REVIEW_LOOKUP_FAILED");
  }
}

export async function POST(request) {
  return withRuntimeDatabase(() => createReviewRoute(request));
}

async function createReviewRoute(request) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;

    await connectDB();
    const body = await readJson(request);
    const productId = body.productId || body.product;
    const rating = toPositiveInteger(body.rating, 0);
    const text = cleanString(body.text || body.reviewText, 2000);
    const title = cleanString(body.title, 100);

    if (!isObjectId(productId)) {
      return failure("INVALID_PRODUCT_ID", "Invalid product id", 400);
    }

    if (rating < 1 || rating > 5) {
      return failure("INVALID_RATING", "Rating must be between 1 and 5", 400);
    }

    if (!text) {
      return failure("INVALID_REVIEW", "Review text is required", 400);
    }

    const product = await Product.findById(productId);
    if (!product) {
      return failure("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    const existing = await Review.findOne({ product: productId, user: auth.user._id });
    if (existing) {
      return failure("REVIEW_EXISTS", "You have already reviewed this product", 409);
    }

    const review = await Review.create({
      product: productId,
      user: auth.user._id,
      rating,
      title,
      text,
      photos: Array.isArray(body.photos) ? body.photos.slice(0, 2) : [],
      verifiedPurchase: await hasVerifiedPurchase(auth.user._id, productId),
      approved: false,
    });

    return success({ review }, 201);
  } catch (error) {
    return handleRouteError(error, "REVIEW_CREATE_FAILED");
  }
}
