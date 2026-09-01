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

function getBearerlessToken(value) {
  const header = cleanString(value, 300);
  return header.toLowerCase().startsWith("token ")
    ? header.slice(6).trim()
    : header;
}

function isAuthorized(request) {
  const secret = cleanString(process.env.SHADOWFAX_WEBHOOK_SECRET, 300);
  if (!secret) return false;

  const authorization = getBearerlessToken(request.headers.get("authorization"));
  const apiKey = cleanString(request.headers.get("x-api-key"), 300);
  const shadowfaxSecret = cleanString(
    request.headers.get("x-shadowfax-webhook-secret"),
    300
  );

  return [authorization, apiKey, shadowfaxSecret].some((value) => value === secret);
}

function parseEventDate(value) {
  const text = cleanString(value, 80);
  if (!text) return null;

  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)
    ? text.replace(" ", "T")
    : text;
  const timestamp = Date.parse(normalized);

  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

function extractShadowfaxWebhookEvent(payload) {
  const statusId = cleanString(
    payload?.event || payload?.status_id || payload?.current_status_id,
    120
  );
  const statusDisplay = cleanString(
    payload?.status || payload?.status_display || payload?.current_status,
    120
  );

  return {
    awbNumber: cleanString(payload?.awb_number || payload?.awb, 100),
    orderId: cleanString(payload?.order_id || payload?.client_order_id, 120),
    statusId,
    statusDisplay: statusDisplay || statusId,
    eventAt: parseEventDate(payload?.event_timestamp || payload?.created),
    location: cleanString(payload?.current_location || payload?.location, 160),
    comments: cleanString(payload?.comments || payload?.remarks, 300),
  };
}

function buildOrderQuery(event) {
  const matches = [];
  if (event.awbNumber) matches.push({ "shadowfax.awbNumber": event.awbNumber });
  if (event.orderId) {
    matches.push({ "shadowfax.clientOrderId": event.orderId });
    matches.push({ orderNumber: event.orderId });
    matches.push({ "shadowfax.orderId": event.orderId });
  }

  return matches.length ? { shippingProvider: "shadowfax", $or: matches } : null;
}

function getStatusRank(status) {
  return ORDER_STATUS_RANK.get(status) ?? -1;
}

function isOlderEvent(order, event) {
  const previous = order?.shadowfax?.lastWebhookAt;
  return Boolean(previous && event.eventAt && event.eventAt < previous);
}

function isDuplicateEvent(order, event) {
  const shadowfax = order?.shadowfax || {};
  return (
    cleanString(shadowfax.lastWebhookEvent) === event.statusId &&
    cleanString(shadowfax.lastWebhookStatus) === event.statusDisplay &&
    (!event.eventAt ||
      !shadowfax.lastWebhookAt ||
      event.eventAt.getTime() === shadowfax.lastWebhookAt.getTime())
  );
}

function shouldApplyMappedOrderStatus(order, mappedStatus) {
  if (!mappedStatus) return false;
  if (order.orderStatus === "cancelled") return false;
  if (order.orderStatus === mappedStatus) return false;

  if (TERMINAL_ORDER_STATUSES.has(order.orderStatus)) {
    return false;
  }

  if (mappedStatus === "cancelled") {
    return true;
  }

  return getStatusRank(mappedStatus) >= getStatusRank(order.orderStatus);
}

export async function POST(request) {
  return withRuntimeDatabase(() => shadowfaxWebhookRoute(request));
}

async function shadowfaxWebhookRoute(request) {
  try {
    if (!process.env.SHADOWFAX_WEBHOOK_SECRET) {
      return failure(
        "SHADOWFAX_WEBHOOK_NOT_CONFIGURED",
        "Shadowfax webhook is not configured.",
        503
      );
    }

    if (!isAuthorized(request)) {
      return failure(
        "INVALID_SHADOWFAX_WEBHOOK_TOKEN",
        "Invalid Shadowfax webhook token.",
        401
      );
    }

    const payload = await readJson(request);
    const event = extractShadowfaxWebhookEvent(payload);

    if (!event.awbNumber && !event.orderId) {
      return success({
        received: true,
        ignored: true,
        reason: "missing_order_identity",
      });
    }

    if (!event.statusId) {
      return success({
        received: true,
        ignored: true,
        reason: "missing_status",
      });
    }

    await connectDB();
    const query = buildOrderQuery(event);
    const order = query ? await Order.findOne(query) : null;

    if (!order) {
      return success({
        received: true,
        matched: false,
        updated: false,
      });
    }

    if (isOlderEvent(order, event)) {
      return success({
        received: true,
        matched: true,
        updated: false,
        stale: true,
      });
    }

    if (isDuplicateEvent(order, event)) {
      return success({
        received: true,
        matched: true,
        updated: false,
        duplicate: true,
        orderStatus: order.orderStatus,
      });
    }

    const previousOrderStatus = order.orderStatus;
    const previousShipmentStatus = order.shadowfax?.shipmentStatus || "";
    const previousStatusDisplay = order.shadowfax?.statusDisplay || "";
    const mappedStatus = mapShippingStatusToOrderStatus(order, event.statusId);

    order.shadowfax ||= {};
    order.shadowfax.awbNumber = event.awbNumber || order.shadowfax.awbNumber || "";
    order.shadowfax.clientOrderId =
      order.shadowfax.clientOrderId || event.orderId || order.orderNumber || "";
    order.shadowfax.shipmentStatus = event.statusId;
    order.shadowfax.statusDisplay = event.statusDisplay;
    order.shadowfax.lastWebhookEvent = event.statusId;
    order.shadowfax.lastWebhookStatus = event.statusDisplay;
    order.shadowfax.lastWebhookAt = event.eventAt || new Date();
    order.shadowfax.lastWebhookLocation = event.location;
    order.shadowfax.lastWebhookComment = event.comments;
    order.shadowfax.lastSyncedAt = new Date();

    if (shouldApplyMappedOrderStatus(order, mappedStatus)) {
      applyShippingStatusToOrder(order, event.statusId);
    }

    await order.save();

    return success({
      received: true,
      matched: true,
      updated:
        order.orderStatus !== previousOrderStatus ||
        order.shadowfax.shipmentStatus !== previousShipmentStatus ||
        order.shadowfax.statusDisplay !== previousStatusDisplay,
      orderStatus: order.orderStatus,
      mappedStatus,
    });
  } catch (error) {
    return handleRouteError(error, "SHADOWFAX_WEBHOOK_FAILED");
  }
}
