import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { ensureDelhiveryPickupScheduled } from "@/lib/shipping/delhiveryPickup";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function POST(request) {
  return withRuntimeDatabase(() => requestPickupRoute(request));
}

async function requestPickupRoute(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);
    const body = await readJson(request);
    await connectDB();
    const result = await ensureDelhiveryPickupScheduled({
      automatic: false,
      requestedPickupDate: body.pickupDate,
    });

    if (result.inProgress) {
      return applyAdminCors(
        request,
        failure(
          "DELHIVERY_PICKUP_IN_PROGRESS",
          "A Delhivery pickup request is already in progress.",
          409,
          { delhiveryPickup: result.settings }
        )
      );
    }
    if (result.needsReconciliation) {
      return applyAdminCors(
        request,
        failure(
          "DELHIVERY_PICKUP_RECONCILIATION_REQUIRED",
          "The previous pickup request needs reconciliation before another request is sent.",
          409,
          { delhiveryPickup: result.settings }
        )
      );
    }
    if (!result.ok && result.reason === "no_ready_shipments") {
      return applyAdminCors(
        request,
        failure(
          "DELHIVERY_PICKUP_NO_SHIPMENTS",
          result.error,
          409,
          { delhiveryPickup: result.settings }
        )
      );
    }
    if (!result.ok) {
      return applyAdminCors(
        request,
        failure(
          "DELHIVERY_PICKUP_FAILED",
          result.error || "Delhivery pickup request failed.",
          502,
          {
            delhiveryPickup: result.settings,
            providerHttpStatus: result.providerHttpStatus,
            providerResponseBodyEmpty: result.providerResponseBodyEmpty,
          }
        )
      );
    }

    return applyAdminCors(
      request,
      success({
        delhiveryPickup: result.settings,
        scheduled: !result.skipped,
        skipped: Boolean(result.skipped),
        message: result.skipped
          ? "A pickup is already scheduled for this date."
          : "Delhivery pickup scheduled.",
      })
    );
  } catch (error) {
    if (
      Number(error?.status) === 400 &&
      error?.code === "DELHIVERY_PICKUP_DATE_INVALID"
    ) {
      return applyAdminCors(
        request,
        failure(error.code, error.message, 400)
      );
    }
    return applyAdminCors(
      request,
      handleRouteError(error, "DELHIVERY_PICKUP_REQUEST_FAILED")
    );
  }
}
