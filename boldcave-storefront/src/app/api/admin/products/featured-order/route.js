import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { clearProductCache } from "@/lib/productCache";
import { isObjectId, toPositiveNumber } from "@/lib/validation";
import Product from "@/models/Product";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function PATCH(request) {
  return withRuntimeDatabase(() => updateFeaturedOrderRoute(request));
}

async function updateFeaturedOrderRoute(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const body = await readJson(request);
    const orderedIds = Array.isArray(body.productIds) ? body.productIds.map(String) : [];

    if (!orderedIds.length || orderedIds.some((id) => !isObjectId(id))) {
      return applyAdminCors(
        request,
        failure("VALIDATION_ERROR", "Featured product ids are required", 400)
      );
    }

    await connectDB();
    const featuredProducts = await Product.find({
      _id: { $in: orderedIds },
      featured: true,
    }).select("_id");
    const featuredIdSet = new Set(featuredProducts.map((product) => String(product._id)));

    if (featuredIdSet.size !== orderedIds.length) {
      return applyAdminCors(
        request,
        failure("VALIDATION_ERROR", "Only featured products can be reordered", 400)
      );
    }

    await Product.bulkWrite(
      orderedIds.map((id, index) => ({
        updateOne: {
          filter: { _id: id, featured: true },
          update: { $set: { featuredOrder: toPositiveNumber(index + 1) } },
        },
      }))
    );

    clearProductCache();

    return applyAdminCors(request, success({ updated: true }));
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error, "FEATURED_ORDER_UPDATE_FAILED"));
  }
}
