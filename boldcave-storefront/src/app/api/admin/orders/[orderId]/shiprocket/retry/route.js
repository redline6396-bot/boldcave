import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { syncShiprocketOrder } from "@/lib/shipping/shiprocket";
import { isObjectId } from "@/lib/validation";
import Order from "@/models/Order";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

async function findOrder(orderId) {
  const query = isObjectId(orderId) ? { _id: orderId } : { orderNumber: orderId };
  return Order.findOne(query);
}

export async function POST(request, context) {
  return withRuntimeDatabase(() => retryAdminShiprocketRoute(request, context));
}

async function retryAdminShiprocketRoute(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { orderId } = await params;
    await connectDB();
    const order = await findOrder(orderId);

    if (!order) {
      return applyAdminCors(
        request,
        failure("ORDER_NOT_FOUND", "Order not found", 404)
      );
    }

    if (order.shiprocket?.shiprocketOrderId || order.shiprocket?.shipmentId) {
      return applyAdminCors(
        request,
        success({ order, skipped: true, message: "Shiprocket order already exists." })
      );
    }

    if (!["failed", "not_configured"].includes(order.shiprocket?.syncStatus)) {
      return applyAdminCors(
        request,
        failure(
          "SHIPROCKET_RETRY_NOT_ALLOWED",
          "Shiprocket retry is only available for failed sync orders.",
          409
        )
      );
    }

    const result = await syncShiprocketOrder(order);

    if (!result.ok && result.inProgress) {
      return applyAdminCors(
        request,
        failure(
          "SHIPROCKET_SYNC_IN_PROGRESS",
          "Shiprocket sync is already in progress for this order.",
          409
        )
      );
    }

    return applyAdminCors(
      request,
      success({
        order: result.order || order,
        synced: Boolean(result.ok),
        skipped: Boolean(result.skipped),
      })
    );
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error, "SHIPROCKET_RETRY_FAILED"));
  }
}
