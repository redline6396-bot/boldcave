import { timingSafeEqual } from "node:crypto";

import connectDB from "@/lib/db";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import {
  applyShippingStatusToOrder,
  mapShippingStatusToOrderStatus,
} from "@/lib/shipping";
import { cleanString } from "@/lib/validation";
import Order from "@/models/Order";

export const runtime = "nodejs";

const TERMINAL_ORDER_STATUSES = new Set(["delivered", "cancelled"]);
const ORDER_STATUS_RANK = new Map([
  ["shipping_pending", 0],
  ["confirmed", 1],
  ["processing", 2],
  ["shipped", 3],
  ["in_transit", 4],
  ["out_for_delivery", 5],
  ["delivered", 6],
]);

function safeSecretEquals(provided, expected) {
  const providedBuffer = Buffer.from(cleanString(provided, 300));
  const expectedBuffer = Buffer.from(cleanString(expected, 300));
  return (
    providedBuffer.length === expectedBuffer.length &&
    providedBuffer.length > 0 &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

function parseEventDate(value) {
  const text = cleanString(value, 80);
  if (!text) return null;
  const timestamp = Date.parse(text.includes("T") ? text : text.replace(" ", "T"));
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

function extractEvent(payload) {
  const shipment = payload?.Shipment || payload?.shipment || {};
  const status = shipment?.Status || shipment?.status || {};
  const statusValue = cleanString(
    status?.Status ||
      status?.status ||
      (typeof shipment?.Status === "string" ? shipment.Status : "") ||
      shipment?.ShipmentStatus,
    120
  );
  const waybill = cleanString(shipment?.AWB || shipment?.Waybill || shipment?.waybill, 100);
  const referenceNo = cleanString(
    shipment?.ReferenceNo || shipment?.reference_no || shipment?.Order,
    120
  );
  const statusDateText = cleanString(
    status?.StatusDateTime || status?.status_date_time,
    80
  );
  const nslCode = cleanString(shipment?.NSLCode || status?.NSLCode, 80);

  return {
    waybill,
    referenceNo,
    status: statusValue,
    statusType: cleanString(status?.StatusType || status?.status_type, 80),
    eventAt: parseEventDate(statusDateText),
    statusDateText,
    location: cleanString(status?.StatusLocation || status?.status_location, 160),
    instructions: cleanString(status?.Instructions || status?.instructions, 300),
    nslCode,
    eventId: [waybill, nslCode, statusDateText, statusValue]
      .map((value) => cleanString(value, 120))
      .join("|")
      .slice(0, 400),
  };
}

function buildOrderQuery(event) {
  const matches = [];
  if (event.waybill) matches.push({ "delhivery.waybill": event.waybill });
  if (event.referenceNo) {
    matches.push({ "delhivery.referenceNo": event.referenceNo });
    matches.push({ orderNumber: event.referenceNo });
  }
  return matches.length
    ? { shippingProvider: "delhivery", $or: matches }
    : null;
}

function shouldIgnoreRegression(order, mappedStatus) {
  if (!mappedStatus || mappedStatus === "cancelled") return false;
  if (TERMINAL_ORDER_STATUSES.has(order.orderStatus)) {
    return mappedStatus !== order.orderStatus;
  }
  const currentRank = ORDER_STATUS_RANK.get(order.orderStatus) ?? -1;
  const nextRank = ORDER_STATUS_RANK.get(mappedStatus) ?? -1;
  return nextRank < currentRank;
}

function eventIndicatesCancellation(event) {
  return [event?.status, event?.statusType, event?.instructions].some((value) => {
    const normalized = cleanString(value, 300).toLowerCase();
    return normalized === "cn" || normalized.includes("cancel");
  });
}

async function reconcileCancellation(order) {
  const { reconcileExternalShipmentCancellation } = await import(
    "@/lib/orders/cancellation"
  );
  return reconcileExternalShipmentCancellation({
    orderId: order._id,
    provider: "delhivery",
    reason: "Shipment cancelled in Delhivery",
  });
}

export async function POST(request) {
  return withRuntimeDatabase(() => delhiveryWebhookRoute(request));
}

async function delhiveryWebhookRoute(request) {
  try {
    const configuredSecret = process.env.DELHIVERY_WEBHOOK_SECRET;
    if (!configuredSecret) {
      return failure(
        "DELHIVERY_WEBHOOK_NOT_CONFIGURED",
        "Delhivery webhook is not configured.",
        503
      );
    }
    if (
      !safeSecretEquals(
        request.headers.get("x-delhivery-webhook-secret"),
        configuredSecret
      )
    ) {
      return failure(
        "INVALID_DELHIVERY_WEBHOOK_SECRET",
        "Invalid Delhivery webhook secret.",
        401
      );
    }

    const payload = await readJson(request);
    const event = extractEvent(payload);
    if (!event.waybill && !event.referenceNo) {
      return success({ received: true, ignored: true, reason: "missing_order_identity" });
    }
    if (!event.status) {
      return success({ received: true, ignored: true, reason: "missing_status" });
    }

    await connectDB();
    const query = buildOrderQuery(event);
    const order = query ? await Order.findOne(query) : null;
    if (!order) {
      return success({ received: true, matched: false, updated: false });
    }

    const previousWebhookAt = order.delhivery?.lastWebhookAt;
    if (previousWebhookAt && event.eventAt && event.eventAt < previousWebhookAt) {
      return success({ received: true, matched: true, updated: false, stale: true });
    }
    const externalCancellation = eventIndicatesCancellation(event);
    if (
      event.eventId &&
      cleanString(order.delhivery?.lastWebhookEvent, 400) === event.eventId
    ) {
      if (externalCancellation && order.orderStatus !== "cancelled") {
        order.delhivery ||= {};
        order.delhivery.cancelStatus = "cancelled";
        order.delhivery.cancelError = "";
        order.delhivery.cancelledAt = order.delhivery.cancelledAt || new Date();
        await order.save();
        const reconciliation = await reconcileCancellation(order);
        return success({
          received: true,
          matched: true,
          updated: reconciliation.order?.orderStatus === "cancelled",
          duplicate: true,
          orderStatus: reconciliation.order?.orderStatus || order.orderStatus,
        });
      }
      return success({
        received: true,
        matched: true,
        updated: false,
        duplicate: true,
        orderStatus: order.orderStatus,
      });
    }

    const mappedStatus = mapShippingStatusToOrderStatus(order, event.status);
    if (shouldIgnoreRegression(order, mappedStatus)) {
      return success({
        received: true,
        matched: true,
        updated: false,
        regression: true,
        orderStatus: order.orderStatus,
        mappedStatus,
      });
    }

    const previousOrderStatus = order.orderStatus;
    const previousShipmentStatus = order.delhivery?.shipmentStatus || "";
    order.delhivery ||= {};
    order.delhivery.waybill = event.waybill || order.delhivery.waybill || "";
    order.delhivery.referenceNo =
      order.delhivery.referenceNo || event.referenceNo || order.orderNumber || "";
    order.delhivery.shipmentStatus = event.status;
    order.delhivery.statusType = event.statusType;
    order.delhivery.statusDisplay = event.status;
    order.delhivery.statusLocation = event.location;
    order.delhivery.instructions = event.instructions;
    order.delhivery.nslCode = event.nslCode;
    order.delhivery.lastWebhookEvent = event.eventId;
    order.delhivery.lastWebhookStatus = event.status;
    order.delhivery.lastWebhookAt = event.eventAt || new Date();
    order.delhivery.lastWebhookLocation = event.location;
    order.delhivery.lastWebhookInstructions = event.instructions;
    order.delhivery.lastWebhookNslCode = event.nslCode;
    order.delhivery.lastSyncedAt = new Date();
    if (externalCancellation) {
      order.delhivery.cancelStatus = "cancelled";
      order.delhivery.cancelError = "";
      order.delhivery.cancelledAt = order.delhivery.cancelledAt || new Date();
    }
    applyShippingStatusToOrder(order, event.status);
    await order.save();

    let persistedOrder = order;
    if (externalCancellation && order.orderStatus !== "cancelled") {
      const reconciliation = await reconcileCancellation(order);
      persistedOrder = reconciliation.order || order;
    }

    return success({
      received: true,
      matched: true,
      updated:
        persistedOrder.orderStatus !== previousOrderStatus ||
        order.delhivery.shipmentStatus !== previousShipmentStatus,
      orderStatus: persistedOrder.orderStatus,
      mappedStatus,
    });
  } catch (error) {
    return handleRouteError(error, "DELHIVERY_WEBHOOK_FAILED");
  }
}
