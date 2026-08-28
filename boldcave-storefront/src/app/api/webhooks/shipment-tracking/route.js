import connectDB from "@/lib/db";
import { failure, readJson, success } from "@/lib/api/response";
import {
  applyShiprocketStatusToOrder,
  mapShiprocketStatusToOrderStatus,
} from "@/lib/shipping/shiprocket";
import Order from "@/models/Order";

export const runtime = "nodejs";

function cleanWebhookString(value, maxLength = 200) {
  return String(value || "").trim().slice(0, maxLength);
}

function maskAwb(awb) {
  const value = String(awb || "");
  if (value.length <= 4) return "****";
  return `****${value.slice(-4)}`;
}

function extractShiprocketWebhookEvent(payload) {
  const awb = cleanWebhookString(payload?.awb, 80);
  const shipmentStatus = cleanWebhookString(payload?.shipment_status, 120);
  const currentStatus = cleanWebhookString(payload?.current_status, 120);

  return {
    awb,
    rawStatus: shipmentStatus || currentStatus,
    courierName: cleanWebhookString(payload?.courier_name, 120),
    shiprocketOrderId: cleanWebhookString(payload?.sr_order_id, 80),
  };
}

export async function POST(request) {
  const secret = process.env.SHIPROCKET_WEBHOOK_SECRET;

  if (!secret) {
    return failure(
      "SHIPROCKET_WEBHOOK_NOT_CONFIGURED",
      "Shiprocket webhook is not configured.",
      503
    );
  }

  const apiKey = request.headers.get("x-api-key") || "";
  if (apiKey !== secret) {
    return failure(
      "INVALID_SHIPROCKET_WEBHOOK_TOKEN",
      "Invalid Shiprocket webhook token.",
      401
    );
  }

  const payload = await readJson(request);
  const event = extractShiprocketWebhookEvent(payload);

  if (!event.awb || !event.rawStatus) {
    console.info("Shiprocket tracking webhook ignored", {
      reason: !event.awb ? "missing_awb" : "missing_status",
    });

    return success({
      received: true,
      ignored: true,
      reason: !event.awb ? "missing_awb" : "missing_status",
    });
  }

  await connectDB();

  const order = await Order.findOne({
    "shiprocket.awbCode": event.awb,
  });

  if (!order) {
    console.info("Shiprocket tracking webhook unmatched", {
      awb: maskAwb(event.awb),
    });

    return success({
      received: true,
      matched: false,
      updated: false,
    });
  }

  const previousOrderStatus = order.orderStatus;
  const previousShipmentStatus = order.shiprocket?.shipmentStatus || "";
  const mappedStatus = mapShiprocketStatusToOrderStatus(event.rawStatus);

  order.shiprocket ||= {};
  order.shiprocket.shipmentStatus = event.rawStatus;
  order.shiprocket.lastSyncedAt = new Date();

  if (event.courierName) {
    order.shiprocket.courierName = event.courierName;
  }

  if (event.shiprocketOrderId && !order.shiprocket.shiprocketOrderId) {
    order.shiprocket.shiprocketOrderId = event.shiprocketOrderId;
  }

  applyShiprocketStatusToOrder(order, event.rawStatus);
  await order.save();

  const statusChanged = order.orderStatus !== previousOrderStatus;
  const shipmentStatusChanged =
    event.rawStatus !== String(previousShipmentStatus || "");

  console.info("Shiprocket tracking webhook handled", {
    awb: maskAwb(event.awb),
    mappedStatus: mappedStatus || "ignored",
    orderStatus: order.orderStatus,
    statusChanged,
    shipmentStatusChanged,
  });

  return success({
    received: true,
    matched: true,
    updated: statusChanged || shipmentStatusChanged,
    orderStatus: order.orderStatus,
    mappedStatus,
  });
}
