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

function getShadowfaxSyncFields(order) {
  const shadowfax = order?.shadowfax || {};
  return {
    orderId: shadowfax.orderId || "",
    awbNumber: shadowfax.awbNumber || "",
    clientOrderId: shadowfax.clientOrderId || order?.orderNumber || "",
    trackingUrl: shadowfax.trackingUrl || "",
    shipmentStatus: shadowfax.shipmentStatus || "",
    statusDisplay: shadowfax.statusDisplay || "",
    syncStatus: shadowfax.syncStatus || "",
    lastError: shadowfax.lastError || "",
    lastAttemptAt: shadowfax.lastAttemptAt || null,
    lastSyncedAt: shadowfax.lastSyncedAt || null,
    syncStartedAt: shadowfax.syncStartedAt || null,
  };
}

export async function POST(request, context) {
  return withRuntimeDatabase(() => retryAdminShadowfaxRoute(request, context));
}

async function retryAdminShadowfaxRoute(request, { params }) {
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

    if (order.shippingProvider !== "shadowfax") {
      return applyAdminCors(
        request,
        failure(
          "SHADOWFAX_RETRY_PROVIDER_MISMATCH",
          "Shadowfax retry is only available for Shadowfax orders.",
          409
        )
      );
    }

    if (order.shadowfax?.awbNumber || order.shadowfax?.orderId) {
      return applyAdminCors(
        request,
        failure(
          "SHADOWFAX_RETRY_ALREADY_SYNCED",
          "Shadowfax shipment already has a provider identifier.",
          409
        )
      );
    }

    if (order.shadowfax?.syncStatus === "needs_reconciliation") {
      return applyAdminCors(
        request,
        failure(
          "SHADOWFAX_RETRY_NEEDS_RECONCILIATION",
          "Shadowfax sync needs reconciliation before retry.",
          409
        )
      );
    }

    if (order.shadowfax?.syncStatus !== "failed") {
      return applyAdminCors(
        request,
        failure(
          "SHADOWFAX_RETRY_NOT_ALLOWED",
          "Shadowfax retry is only available for failed sync orders.",
          409
        )
      );
    }

    const result = await syncShipment(order);
    const updatedOrder = result.order || order;

    if (!result.ok && result.inProgress) {
      return applyAdminCors(
        request,
        failure(
          "SHADOWFAX_SYNC_IN_PROGRESS",
          "Shadowfax sync is already in progress for this order.",
          409,
          { shadowfax: getShadowfaxSyncFields(updatedOrder) }
        )
      );
    }

    if (!result.ok) {
      return applyAdminCors(
        request,
        failure(
          "SHADOWFAX_SYNC_FAILED",
          result.error || "Shadowfax sync failed.",
          502,
          { shadowfax: getShadowfaxSyncFields(updatedOrder) }
        )
      );
    }

    return applyAdminCors(
      request,
      success({
        shadowfax: getShadowfaxSyncFields(updatedOrder),
        synced: Boolean(result.ok),
        skipped: Boolean(result.skipped),
      })
    );
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error, "SHADOWFAX_RETRY_FAILED"));
  }
}
