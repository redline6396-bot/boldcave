import connectDB from "@/lib/db";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { cleanString, isObjectId, toPositiveInteger } from "@/lib/validation";
import Review from "@/models/Review";

export const runtime = "nodejs";

export async function PATCH(request, context) {
  return withRuntimeDatabase(() => updateReviewRoute(request, context));
}

async function updateReviewRoute(request, { params }) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;

    const { reviewId } = await params;
    if (!isObjectId(reviewId)) {
      return failure("INVALID_REVIEW_ID", "Invalid review id", 400);
    }

    await connectDB();
    const review = await Review.findById(reviewId);
    if (!review) {
      return failure("REVIEW_NOT_FOUND", "Review not found", 404);
    }

    if (String(review.user) !== String(auth.user._id)) {
      return failure("FORBIDDEN", "You can only edit your own review", 403);
    }

    const body = await readJson(request);
    if (body.rating !== undefined) {
      const rating = toPositiveInteger(body.rating, 0);
      if (rating < 1 || rating > 5) {
        return failure("INVALID_RATING", "Rating must be between 1 and 5", 400);
      }
      review.rating = rating;
    }

    if (body.title !== undefined) review.title = cleanString(body.title, 100);
    if (body.text !== undefined || body.reviewText !== undefined) {
      const text = cleanString(body.text || body.reviewText, 2000);
      if (!text) return failure("INVALID_REVIEW", "Review text is required", 400);
      review.text = text;
    }
    if (Array.isArray(body.photos)) review.photos = body.photos.slice(0, 2);
    review.approved = false;

    await review.save();
    return success({ review });
  } catch (error) {
    return handleRouteError(error, "REVIEW_UPDATE_FAILED");
  }
}

export async function DELETE(request, context) {
  return withRuntimeDatabase(() => deleteReviewRoute(request, context));
}

async function deleteReviewRoute(request, { params }) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;

    const { reviewId } = await params;
    if (!isObjectId(reviewId)) {
      return failure("INVALID_REVIEW_ID", "Invalid review id", 400);
    }

    await connectDB();
    const review = await Review.findById(reviewId);
    if (!review) {
      return failure("REVIEW_NOT_FOUND", "Review not found", 404);
    }

    if (String(review.user) !== String(auth.user._id)) {
      return failure("FORBIDDEN", "You can only delete your own review", 403);
    }

    await review.deleteOne();
    return success({ deleted: true });
  } catch (error) {
    return handleRouteError(error, "REVIEW_DELETE_FAILED");
  }
}
