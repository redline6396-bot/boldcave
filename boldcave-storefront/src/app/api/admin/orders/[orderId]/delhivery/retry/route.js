import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { syncShipment } from "@/lib/shipping";
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
  return withRuntimeDatabase(() => retryAdminDelhiveryRoute(request, context));
}

async function retryAdminDelhiveryRoute(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);
    const { orderId } = await params;
    await connectDB();
    const order = await findOrder(orderId);
    if (!order) {
      return applyAdminCors(request, failure("ORDER_NOT_FOUND", "Order not found", 404));
    }
    if (order.shippingProvider !== "delhivery") {
      return applyAdminCors(
        request,
        failure(
          "DELHIVERY_RETRY_PROVIDER_MISMATCH",
          "Delhivery retry is only available for Delhivery orders.",
          409
        )
      );
    }
    if (
      order.orderStatus === "cancelled" ||
      ["processing", "cancelled"].includes(order.cancellation?.status)
    ) {
      return applyAdminCors(
        request,
        failure(
          "DELHIVERY_RETRY_ORDER_CANCELLED",
          "A shipment cannot be created for a cancelled order.",
          409
        )
      );
    }
    if (order.delhivery?.waybill) {
      return applyAdminCors(
        request,
        success({ order, skipped: true, message: "Delhivery shipment already exists." })
      );
    }
    if (order.delhivery?.syncStatus === "needs_reconciliation") {
      return applyAdminCors(
        request,
        failure(
          "DELHIVERY_RETRY_NEEDS_RECONCILIATION",
          "Delhivery sync needs reconciliation before retry.",
          409
        )
      );
    }
    if (order.delhivery?.syncStatus === "syncing") {
      return applyAdminCors(
        request,
        failure(
          "DELHIVERY_SYNC_IN_PROGRESS",
          "Delhivery sync is already in progress for this order.",
          409
        )
      );
    }
    if (order.delhivery?.syncStatus !== "failed") {
      return applyAdminCors(
        request,
        failure(
          "DELHIVERY_RETRY_NOT_ALLOWED",
          "Delhivery retry is only available for failed sync orders.",
          409
        )
      );
    }

    const result = await syncShipment(order);
    let updatedOrder = result.order || order;
    if (!result.ok) {
      return applyAdminCors(
        request,
        failure(
          result.needsReconciliation
            ? "DELHIVERY_MANIFEST_RECONCILIATION_REQUIRED"
            : "DELHIVERY_SYNC_FAILED",
          result.error || "Delhivery sync failed.",
          result.needsReconciliation ? 409 : 502,
          { order: updatedOrder }
        )
      );
    }

    if (updatedOrder.orderStatus === "shipping_pending") {
      updatedOrder =
        (await Order.findByIdAndUpdate(
          updatedOrder._id,
          { $set: { orderStatus: "confirmed" } },
          { returnDocument: "after" }
        )) || updatedOrder;
    }

    return applyAdminCors(
      request,
      success({
        order: updatedOrder,
        synced: Boolean(result.ok),
        skipped: Boolean(result.skipped),
      })
    );
  } catch (error) {
    return applyAdminCors(
      request,
      handleRouteError(error, "DELHIVERY_RETRY_FAILED")
    );
  }
}
