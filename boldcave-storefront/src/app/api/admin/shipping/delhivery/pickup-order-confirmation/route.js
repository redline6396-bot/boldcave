import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import {
  confirmDelhiveryOrderAddedToPickup,
  revokeDelhiveryOrderPickupConfirmation,
} from "@/lib/shipping/delhiveryPickup";
import { isObjectId } from "@/lib/validation";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function POST(request) {
  return withRuntimeDatabase(() => confirmPickupOrderRoute(request));
}

async function confirmPickupOrderRoute(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);
    const body = await readJson(request);
    if (!isObjectId(body.orderId)) {
      return applyAdminCors(
        request,
        failure("ORDER_ID_INVALID", "A valid order ID is required.", 400)
      );
    }

    await connectDB();
    const revoke = body.action === "revoke";
    const result = revoke
      ? await revokeDelhiveryOrderPickupConfirmation({
          orderId: body.orderId,
          pickupId: body.pickupId,
        })
      : await confirmDelhiveryOrderAddedToPickup({
          orderId: body.orderId,
          pickupId: body.pickupId,
        });
    return applyAdminCors(
      request,
      success({
        pickupId: result.pickupId,
        alreadyConfirmed: result.alreadyConfirmed,
        alreadyReverted: result.alreadyReverted,
        message: revoke
          ? result.alreadyReverted
            ? "This order is already marked as not added."
            : "Order marked as not added."
          : result.alreadyConfirmed
            ? "This order is already marked as added."
            : "Order marked as added.",
      })
    );
  } catch (error) {
    if ([400, 404, 409].includes(Number(error?.status)) && error?.code) {
      return applyAdminCors(
        request,
        failure(error.code, error.message, Number(error.status))
      );
    }
    return applyAdminCors(
      request,
      handleRouteError(error, "DELHIVERY_PICKUP_ORDER_CONFIRMATION_FAILED")
    );
  }
}
