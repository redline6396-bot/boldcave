import { getOrderShippingSummary } from "@/lib/shipping/summary";

export const CANCELLABLE_ORDER_STATUSES = ["confirmed", "processing"];

const SHIPMENT_STARTED_ORDER_STATUSES = [
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
];

function normalizeStatus(rawStatus) {
  return String(rawStatus || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");
}

export function shipmentStatusIndicatesMovement(rawStatus) {
  const status = normalizeStatus(rawStatus);

  if (!status) return false;
  if (status.includes("pickup scheduled")) return false;
  if (status.includes("ready to ship")) return false;
  if (status.includes("awb assigned")) return false;
  if (status.includes("manifest generated")) return false;

  return (
    status.includes("out for pickup") ||
    status.includes("picked up") ||
    status.includes("pickup done") ||
    status.includes("picked by") ||
    status.includes("picked") ||
    status.includes("received from client warehouse") ||
    status.includes("assigned for seller pickup") ||
    status === "ofp" ||
    status.includes("handed over") ||
    status.includes("handed to courier") ||
    status.includes("handover") ||
    status.includes("shipped") ||
    status.includes("dispatched") ||
    status.includes("bag in transit") ||
    status.includes("recd at fwd hub") ||
    status.includes("recd at fwd dc") ||
    status.includes("reached") ||
    status.includes("bagged") ||
    status.includes("in transit") ||
    status.includes("intransit") ||
    status.includes("transit") ||
    status.includes("assigned for delivery") ||
    status.includes("out for delivery") ||
    status.includes("outfordelivery") ||
    status === "ofd" ||
    (status.includes("delivered") && !status.includes("rto"))
  );
}

export function getCancellationEligibility(order) {
  const orderStatus = String(order?.orderStatus || "confirmed").toLowerCase();

  if (orderStatus === "cancelled") {
    return { cancellable: false, reason: "already_cancelled" };
  }

  if (SHIPMENT_STARTED_ORDER_STATUSES.includes(orderStatus)) {
    return { cancellable: false, reason: "shipment_started" };
  }

  if (!CANCELLABLE_ORDER_STATUSES.includes(orderStatus)) {
    return { cancellable: false, reason: "order_status" };
  }

  const shipping = getOrderShippingSummary(order);
  const providerStatuses = [
    shipping.shipmentStatus,
    shipping.statusDisplay,
    order?.shiprocket?.shipmentStatus,
    order?.shadowfax?.shipmentStatus,
    order?.shadowfax?.statusDisplay,
    order?.shadowfax?.lastWebhookStatus,
  ];

  if (providerStatuses.some(shipmentStatusIndicatesMovement)) {
    return { cancellable: false, reason: "shipment_started" };
  }

  return { cancellable: true, reason: "" };
}

export function isOrderCancellable(order) {
  return getCancellationEligibility(order).cancellable;
}
