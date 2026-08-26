import connectDB from "@/lib/db";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import {
  applyShiprocketStatusToOrder,
  getStatusFromTracking,
  getTrackingByAwb,
} from "@/lib/shipping/shiprocket";
import Order from "@/models/Order";

export const runtime = "nodejs";

function isAuthorized(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return Boolean(process.env.CRON_SECRET && token === process.env.CRON_SECRET);
}

export async function POST(request) {
  try {
    if (!isAuthorized(request)) {
      return failure("UNAUTHENTICATED", "Cron secret required", 401);
    }

    await connectDB();
    const body = await readJson(request);
    const limit = Math.min(Number(body.limit) || 25, 100);
    const orders = await Order.find({
      "shiprocket.awbCode": { $exists: true, $ne: "" },
      orderStatus: {
        $in: ["confirmed", "processing", "shipped", "in_transit", "out_for_delivery"],
      },
    }).limit(limit);

    let updated = 0;
    const errors = [];

    for (const order of orders) {
      try {
        const tracking = await getTrackingByAwb(order.shiprocket.awbCode);
        const status = getStatusFromTracking(tracking) || order.shiprocket.shipmentStatus;

        order.shiprocket.shipmentStatus = status;
        order.shiprocket.lastSyncedAt = new Date();
        applyShiprocketStatusToOrder(order, status);
        await order.save();
        updated += 1;
      } catch (error) {
        errors.push({ orderNumber: order.orderNumber, message: error.message });
      }
    }

    return success({ checked: orders.length, updated, errors });
  } catch (error) {
    return handleRouteError(error, "ORDER_STATUS_SYNC_FAILED");
  }
}
