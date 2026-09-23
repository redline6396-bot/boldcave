import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
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

export async function PATCH(request) {
  return withRuntimeDatabase(() => patchAdminReviewsRoute(request));
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
    
    let userIdsFromOrders = [];
    if (search.toLowerCase().startsWith('ord-')) {
      await connectDB();
      const Order = (await import("@/models/Order")).default;
      const matchingOrders = await Order.find({ orderNumber: { $regex: search, $options: "i" } }).select("user");
      userIdsFromOrders = matchingOrders.map(o => o.user).filter(Boolean);
    }

    if (search) {
      filter.$or = [{ title: { $regex: search, $options: "i" } }, { text: { $regex: search, $options: "i" } }];
      if (isObjectId(search)) filter.$or.push({ _id: search }, { user: search });
      if (userIdsFromOrders.length > 0) filter.$or.push({ user: { $in: userIdsFromOrders } });
    }

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

async function patchAdminReviewsRoute(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const body = await readJson(request);
    if (body.action === "approveAllPending") {
      await connectDB();
      const result = await Review.updateMany({ approved: false }, { $set: { approved: true } });
      return applyAdminCors(request, success({ modifiedCount: result.modifiedCount }, 200));
    }

    return applyAdminCors(request, failure("INVALID_ACTION", "Invalid action", 400));
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error));
  }
}
