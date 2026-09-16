import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { reconcileExternalShipmentCancellation } from "@/lib/orders/cancellation";
import {
  getOrderShippingProvider,
  SHIPPING_PROVIDERS,
} from "@/lib/shipping";
import { cleanString, isObjectId } from "@/lib/validation";
import Order from "@/models/Order";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function POST(request, context) {
  return withRuntimeDatabase(() =>
    reconcileDelhiveryCancellationRoute(request, context)
  );
}

async function reconcileDelhiveryCancellationRoute(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const body = await readJson(request);
    if (body.confirmedExternalCancellation !== true) {
      return applyAdminCors(
        request,
        failure(
          "DELHIVERY_CANCELLATION_CONFIRMATION_REQUIRED",
          "Confirm that this shipment was cancelled in Delhivery One.",
          400
        )
      );
    }

    const { orderId } = await params;
    const query = isObjectId(orderId) ? { _id: orderId } : { orderNumber: orderId };
    await connectDB();
    const order = await Order.findOne(query);
    if (!order) {
      return applyAdminCors(
        request,
        failure("ORDER_NOT_FOUND", "Order not found", 404)
      );
    }
    if (getOrderShippingProvider(order) !== SHIPPING_PROVIDERS.DELHIVERY) {
      return applyAdminCors(
        request,
        failure(
          "DELHIVERY_ORDER_REQUIRED",
          "This order was not created with Delhivery.",
          400
        )
      );
    }
    if (!order.delhivery?.waybill) {
      return applyAdminCors(
        request,
        failure(
          "DELHIVERY_WAYBILL_REQUIRED",
          "This order does not have a Delhivery waybill.",
          409
        )
      );
    }
    if (order.orderStatus === "cancelled") {
      return applyAdminCors(
        request,
        success({ order, reconciled: false, alreadyCancelled: true })
      );
    }

    const now = new Date();
    order.delhivery.cancelStatus = "cancelled";
    order.delhivery.cancelError = "";
    order.delhivery.cancelledAt = order.delhivery.cancelledAt || now;
    await order.save();

    const result = await reconcileExternalShipmentCancellation({
      orderId: order._id,
      provider: SHIPPING_PROVIDERS.DELHIVERY,
      reason:
        cleanString(body.reason, 500) ||
        "Shipment cancellation confirmed in Delhivery One",
    });

    if (!result.ok && result.order?.orderStatus !== "cancelled") {
      return applyAdminCors(
        request,
        failure(
          "DELHIVERY_CANCELLATION_RECONCILIATION_FAILED",
          "The Delhivery cancellation was recorded, but the Bold Cave order could not be finalized.",
          409,
          { order: result.order, reason: result.reason }
        )
      );
    }

    return applyAdminCors(
      request,
      success({
        order: result.order,
        reconciled: !result.skipped,
        alreadyCancelled: Boolean(result.alreadyCancelled),
      })
    );
  } catch (error) {
    return applyAdminCors(
      request,
      handleRouteError(error, "DELHIVERY_CANCELLATION_RECONCILIATION_FAILED")
    );
  }
}
