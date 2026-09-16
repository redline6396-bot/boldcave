import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import {
  getOrderShippingProvider,
  SHIPPING_PROVIDERS,
  trackShipment,
} from "@/lib/shipping";
import { isObjectId } from "@/lib/validation";
import Order from "@/models/Order";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function POST(request, context) {
  return withRuntimeDatabase(() => refreshDelhiveryTrackingRoute(request, context));
}

async function refreshDelhiveryTrackingRoute(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

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

    const tracking = await trackShipment(order, { forceRefresh: true });
    const updatedOrder = await Order.findById(order._id);
    return applyAdminCors(request, success({ order: updatedOrder, tracking }));
  } catch (error) {
    return applyAdminCors(
      request,
      handleRouteError(error, "DELHIVERY_TRACKING_REFRESH_FAILED")
    );
  }
}
