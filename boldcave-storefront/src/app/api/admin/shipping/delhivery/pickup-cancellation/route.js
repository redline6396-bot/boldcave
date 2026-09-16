import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { confirmDelhiveryPickupCancelled } from "@/lib/shipping/delhiveryPickup";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function POST(request) {
  return withRuntimeDatabase(() => confirmPickupCancellationRoute(request));
}

async function confirmPickupCancellationRoute(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);
    const body = await readJson(request);
    await connectDB();
    const result = await confirmDelhiveryPickupCancelled({
      pickupId: body.pickupId,
      confirmedProviderCancellation:
        body.confirmedProviderCancellation === true,
    });

    return applyAdminCors(
      request,
      success({
        delhiveryPickup: result.settings,
        alreadyConfirmed: result.alreadyConfirmed,
        message: result.alreadyConfirmed
          ? "Pickup cancellation was already confirmed."
          : "Pickup cancellation confirmed in Bold Cave.",
      })
    );
  } catch (error) {
    if ([400, 409].includes(Number(error?.status)) && error?.code) {
      return applyAdminCors(
        request,
        failure(error.code, error.message, Number(error.status))
      );
    }
    return applyAdminCors(
      request,
      handleRouteError(error, "DELHIVERY_PICKUP_CANCELLATION_FAILED")
    );
  }
}
