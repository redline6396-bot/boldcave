import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { isObjectId } from "@/lib/validation";
import Review from "@/models/Review";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function PATCH(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { reviewId } = await params;
    if (!isObjectId(reviewId)) return applyAdminCors(request, failure("INVALID_REVIEW_ID", "Invalid review id", 400));

    const body = await readJson(request);
    const updates = {};
    if (typeof body.approved === "boolean") updates.approved = body.approved;
    if (typeof body.verifiedPurchase === "boolean") updates.verifiedPurchase = body.verifiedPurchase;

    await connectDB();
    const review = await Review.findByIdAndUpdate(reviewId, updates, {
      new: true,
      runValidators: true,
    });

    if (!review) return applyAdminCors(request, failure("REVIEW_NOT_FOUND", "Review not found", 404));
    return applyAdminCors(request, success({ review }));
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error, "REVIEW_UPDATE_FAILED"));
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { reviewId } = await params;
    if (!isObjectId(reviewId)) return applyAdminCors(request, failure("INVALID_REVIEW_ID", "Invalid review id", 400));

    await connectDB();
    const review = await Review.findByIdAndDelete(reviewId);
    if (!review) return applyAdminCors(request, failure("REVIEW_NOT_FOUND", "Review not found", 404));

    return applyAdminCors(request, success({ deleted: true }));
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error, "REVIEW_DELETE_FAILED"));
  }
}
