import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { handleRouteError, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { getDelhiveryPickupHistory } from "@/lib/shipping/delhiveryPickup";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function GET(request) {
  return withRuntimeDatabase(() => getPickupHistoryRoute(request));
}

async function getPickupHistoryRoute(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);
    const { searchParams } = new URL(request.url);
    await connectDB();
    const history = await getDelhiveryPickupHistory({
      limit: searchParams.get("limit"),
      state: searchParams.get("state"),
    });
    return applyAdminCors(request, success(history));
  } catch (error) {
    return applyAdminCors(
      request,
      handleRouteError(error, "DELHIVERY_PICKUP_HISTORY_FAILED")
    );
  }
}
