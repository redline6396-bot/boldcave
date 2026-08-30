import connectDB from "@/lib/db";
import { failure, handleRouteError, success } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import {
  applyShiprocketStatusToOrder,
  getStatusFromTracking,
  getTrackingByAwb,
} from "@/lib/shipping/shiprocket";
import { isObjectId } from "@/lib/validation";
import Order from "@/models/Order";

export const runtime = "nodejs";

export async function GET(request) {
  return withRuntimeDatabase(() => getShipmentTrackingRoute(request));
}

async function getShipmentTrackingRoute(request) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId") || "";
    const query = isObjectId(orderId)
      ? { _id: orderId, user: auth.user._id }
      : { orderNumber: orderId, user: auth.user._id };

    await connectDB();
    const order = await Order.findOne(query);

    if (!order) {
      return failure("ORDER_NOT_FOUND", "Order not found", 404);
    }

    if (!order.shiprocket?.awbCode) {
      return success({
        available: false,
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        status: order.shiprocket?.shipmentStatus || order.orderStatus,
      });
    }

    const tracking = await getTrackingByAwb(order.shiprocket.awbCode);
    const status = getStatusFromTracking(tracking) || order.shiprocket.shipmentStatus;
    order.shiprocket.shipmentStatus = status;
    order.shiprocket.lastSyncedAt = new Date();
    applyShiprocketStatusToOrder(order, status);
    await order.save();

    return success({
      available: true,
      awbCode: order.shiprocket.awbCode,
      trackingUrl: order.shiprocket.trackingUrl,
      status: order.shiprocket.shipmentStatus,
      orderStatus: order.orderStatus,
      tracking,
    });
  } catch (error) {
    return handleRouteError(error, "TRACKING_FAILED");
  }
}
