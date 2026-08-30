import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { handleRouteError, success } from "@/lib/api/response";
import { serializeAdminReview } from "@/lib/api/reviews";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { isObjectId, toPositiveInteger } from "@/lib/validation";
import Review from "@/models/Review";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function GET(request) {
  return withRuntimeDatabase(() => getAdminReviewsRoute(request));
}

async function getAdminReviewsRoute(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const rating = toPositiveInteger(searchParams.get("rating"), 0);
    const approved = searchParams.get("approved");
    const search = String(searchParams.get("search") || "").trim();
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
    const skip = Math.max(Number(searchParams.get("skip")) || 0, 0);

    const filter = {};
    if (productId && isObjectId(productId)) filter.product = productId;
    if (rating >= 1 && rating <= 5) filter.rating = rating;
    if (approved === "true") filter.approved = true;
    if (approved === "false") filter.approved = false;
    if (search) filter.$or = [{ title: { $regex: search, $options: "i" } }, { text: { $regex: search, $options: "i" } }];

    await connectDB();
    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("product", "name slug")
        .populate("user", "firstName lastName phone email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(filter),
    ]);

    return applyAdminCors(
      request,
      success({ reviews: reviews.map(serializeAdminReview), total, limit, skip })
    );
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error));
  }
}
