import mongoose from "mongoose";

import connectDB from "@/lib/db";
import { getRuntimeDatabaseContext } from "@/lib/runtimeDatabaseContext";
import { restoreStock } from "@/lib/orders/pricing";
import {
  RefundServiceError,
  refundRemainingForCancellation,
} from "@/lib/payments/refunds";
import {
  cancelShipment,
  getOrderShippingProvider,
  hasShipmentCancellationTarget,
  mapShippingStatusToOrderStatus,
  SHIPPING_PROVIDERS,
} from "@/lib/shipping";
import { getOrderShippingSummary } from "@/lib/shipping/summary";
import { cleanString, isObjectId } from "@/lib/validation";
import Order from "@/models/Order";

export const CANCELLABLE_ORDER_STATUSES = ["confirmed", "processing"];

export class CancellationError extends Error {
  constructor(code, message, status = 400, details = undefined) {
    super(message);
    this.name = "CancellationError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function sanitizeError(error) {
  return String(error?.message || "Cancellation failed").slice(0, 300);
}

function customerSafeRefundError() {
  return "Your refund could not be completed automatically. Our team will review it.";
}

function getOrderQuery(orderId) {
  return isObjectId(orderId)
    ? { _id: orderId }
    : { orderNumber: String(orderId || "") };
}

function normalizeReason(reason) {
  return cleanString(reason, 500);
}

function isPrepaidRazorpay(order) {
  return (
    order?.payment?.method === "razorpay" &&
    order?.payment?.paymentStatus === "paid"
  );
}

async function processPrepaidRefund(order, { reason, actor }) {
  try {
    const result = await refundRemainingForCancellation({ order, reason, actor });
    return result.order;
  } catch (error) {
    if (error instanceof RefundServiceError) {
      throw new CancellationError(
        error.code,
        error.message || customerSafeRefundError(),
        error.status,
        error.details
      );
    }

    throw error;
  }
}

function shipmentStatusIndicatesMovement(rawStatus) {
  const status = String(rawStatus || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");

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
    status.includes("handed over") ||
    status.includes("handed to courier") ||
    status.includes("handover") ||
    status.includes("shipped") ||
    status.includes("dispatched") ||
    status.includes("in transit") ||
    status.includes("intransit") ||
    status.includes("transit") ||
    status.includes("out for delivery") ||
    status.includes("outfordelivery") ||
    status === "ofd" ||
    (status.includes("delivered") && !status.includes("rto"))
  );
}

function assertCancellable(order) {
  if (order.orderStatus === "cancelled") {
    throw new CancellationError(
      "ORDER_ALREADY_CANCELLED",
      "This order is already cancelled.",
      409
    );
  }

  if (!CANCELLABLE_ORDER_STATUSES.includes(order.orderStatus)) {
    throw new CancellationError(
      "ORDER_NOT_CANCELLABLE",
      "This order can no longer be cancelled.",
      409
    );
  }

  const shipping = getOrderShippingSummary(order);
  const mappedShipmentStatus = mapShippingStatusToOrderStatus(
    order,
    shipping.shipmentStatus
  );

  if (
    mappedShipmentStatus &&
    !CANCELLABLE_ORDER_STATUSES.includes(mappedShipmentStatus)
  ) {
    throw new CancellationError(
      "SHIPMENT_ALREADY_STARTED",
      "This order can no longer be cancelled after shipment has started.",
      409
    );
  }

  if (shipmentStatusIndicatesMovement(shipping.shipmentStatus)) {
    throw new CancellationError(
      "SHIPMENT_ALREADY_STARTED",
      "This order can no longer be cancelled after shipment has started.",
      409
    );
  }
}

async function loadOrder({ orderId, userId }) {
  const query = getOrderQuery(orderId);
  if (userId) query.user = userId;

  const order = await Order.findOne(query);
  if (!order) {
    throw new CancellationError("ORDER_NOT_FOUND", "Order not found", 404);
  }

  return order;
}

function getClaimFilter(order, userId) {
  const filter = {
    _id: order._id,
    orderStatus: { $in: CANCELLABLE_ORDER_STATUSES },
    $or: [
      { "cancellation.status": { $exists: false } },
      { "cancellation.status": "none" },
      { "cancellation.status": "failed" },
    ],
  };

  if (userId) filter.user = userId;
  return filter;
}

async function failClaimedCancellation(orderId, updates = {}) {
  return Order.findByIdAndUpdate(
    orderId,
    {
      $set: {
        "cancellation.status": "failed",
        ...updates,
      },
    },
    { returnDocument: "after" }
  );
}

async function finalizeCancellation({
  orderId,
  actor,
  reason,
  shiprocketCancelStatus,
}) {
  const runtimeConnection = getRuntimeDatabaseContext()?.connection;
  const session = runtimeConnection
    ? await runtimeConnection.startSession()
    : await mongoose.startSession();
  let finalOrder = null;

  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({
        _id: orderId,
        orderStatus: { $in: CANCELLABLE_ORDER_STATUSES },
        "cancellation.status": "processing",
        "stockRestoration.status": { $ne: "restored" },
      }).session(session);

      if (!order) {
        throw new CancellationError(
          "CANCELLATION_FINALIZE_CONFLICT",
          "Cancellation could not be finalized. Please refresh and try again.",
          409
        );
      }

      order.stockRestoration.status = "restoring";
      order.stockRestoration.error = "";
      await order.save({ session });

      await restoreStock(order.items, { session });

      const now = new Date();
      order.orderStatus = "cancelled";
      order.cancellation.status = "cancelled";
      order.cancellation.reason = reason;
      order.cancellation.cancelledBy = actor;
      order.cancellation.cancelledAt = now;
      order.cancellation.shiprocketCancelStatus = shiprocketCancelStatus;
      order.cancellation.shiprocketCancelError = "";
      order.stockRestoration.status = "restored";
      order.stockRestoration.restoredAt = now;
      order.stockRestoration.error = "";
      await order.save({ session });

      finalOrder = order;
    });
  } finally {
    await session.endSession();
  }

  return finalOrder;
}

export async function cancelOrder({
  orderId,
  actor,
  reason,
  userId = null,
}) {
  await connectDB();

  const normalizedReason = normalizeReason(reason);
  if (!normalizedReason) {
    throw new CancellationError(
      "CANCELLATION_REASON_REQUIRED",
      "Cancellation reason is required.",
      400
    );
  }

  if (!["customer", "admin"].includes(actor)) {
    throw new CancellationError("INVALID_ACTOR", "Invalid cancellation actor.", 400);
  }

  const order = await loadOrder({ orderId, userId });
  assertCancellable(order);
  const prepaidRazorpay = isPrepaidRazorpay(order);

  const hasShiprocketCancellationTarget = hasShipmentCancellationTarget(order);
  const shiprocketAlreadyCancelled =
    order.cancellation?.shiprocketCancelStatus === "cancelled";

  const claimedOrder = await Order.findOneAndUpdate(
    getClaimFilter(order, userId),
    {
      $set: {
        "cancellation.status": "processing",
        "cancellation.reason": normalizedReason,
        "cancellation.cancelledBy": actor,
        "cancellation.shiprocketCancelStatus": shiprocketAlreadyCancelled
          ? "cancelled"
          : hasShiprocketCancellationTarget
            ? "pending"
            : "not_required",
        "cancellation.shiprocketCancelError": "",
        "stockRestoration.status": "pending",
        "stockRestoration.error": "",
      },
      $unset: {
        "cancellation.cancelledAt": "",
        "stockRestoration.restoredAt": "",
      },
    },
    { returnDocument: "after" }
  );

  if (!claimedOrder) {
    const latestOrder = await loadOrder({ orderId, userId });

    if (latestOrder.orderStatus === "cancelled") {
      throw new CancellationError(
        "ORDER_ALREADY_CANCELLED",
        "This order is already cancelled.",
        409,
        { order: latestOrder }
      );
    }

    if (latestOrder.cancellation?.status === "processing") {
      throw new CancellationError(
        "CANCELLATION_IN_PROGRESS",
        "Cancellation is already in progress.",
        409,
        { order: latestOrder }
      );
    }

    assertCancellable(latestOrder);
    throw new CancellationError(
      "CANCELLATION_CLAIM_FAILED",
      "Cancellation could not be started. Please retry.",
      409,
      { order: latestOrder }
    );
  }

  try {
    assertCancellable(claimedOrder);
  } catch (error) {
    const failedOrder = await failClaimedCancellation(claimedOrder._id, {
      "cancellation.shiprocketCancelStatus": "failed",
      "cancellation.shiprocketCancelError": sanitizeError(error),
      "stockRestoration.status": "not_required",
      "stockRestoration.error": "",
    });

    if (error instanceof CancellationError) {
      error.details = { ...(error.details || {}), order: failedOrder };
      throw error;
    }

    throw error;
  }

  const claimedShippingProvider = getOrderShippingProvider(claimedOrder);
  const claimedHasShiprocketTarget = hasShipmentCancellationTarget(claimedOrder);
  const claimedShiprocketAlreadyCancelled =
    claimedOrder.cancellation?.shiprocketCancelStatus === "cancelled";
  let shiprocketCancelStatus =
    claimedOrder.cancellation?.shiprocketCancelStatus || "not_required";

  if (claimedHasShiprocketTarget && !claimedShiprocketAlreadyCancelled) {
    try {
      await cancelShipment(claimedOrder);
      shiprocketCancelStatus = "cancelled";
      await Order.findByIdAndUpdate(claimedOrder._id, {
        $set: {
          "cancellation.shiprocketCancelStatus": "cancelled",
          "cancellation.shiprocketCancelError": "",
        },
      });
    } catch (error) {
      const isShiprocketProvider =
        claimedShippingProvider === SHIPPING_PROVIDERS.SHIPROCKET;
      const failureUpdates = {
        "cancellation.shiprocketCancelStatus": "failed",
        "cancellation.shiprocketCancelError": sanitizeError(error),
        "stockRestoration.status": "not_required",
        "stockRestoration.error": "",
      };

      if (!isShiprocketProvider) {
        failureUpdates["shadowfax.cancelStatus"] = "failed";
        failureUpdates["shadowfax.cancelError"] = sanitizeError(error);
      }

      const failedOrder = await failClaimedCancellation(
        claimedOrder._id,
        failureUpdates
      );

      throw new CancellationError(
        isShiprocketProvider ? "SHIPROCKET_CANCEL_FAILED" : "SHIPMENT_CANCEL_FAILED",
        isShiprocketProvider
          ? "Shiprocket cancellation failed. The order was not cancelled."
          : "Shipment cancellation failed. The order was not cancelled.",
        502,
        { order: failedOrder }
      );
    }
  }

  if (prepaidRazorpay) {
    try {
      await processPrepaidRefund(claimedOrder, {
        reason: normalizedReason,
        actor,
      });
    } catch (error) {
      const failedOrder = await failClaimedCancellation(claimedOrder._id, {
        "cancellation.shiprocketCancelStatus": shiprocketCancelStatus,
        "cancellation.shiprocketCancelError":
          shiprocketCancelStatus === "failed" ? sanitizeError(error) : "",
        "stockRestoration.status": "not_required",
        "stockRestoration.error": "",
      });

      if (error instanceof CancellationError) {
        error.details = { ...(error.details || {}), order: failedOrder };
        throw error;
      }

      throw new CancellationError(
        "RAZORPAY_REFUND_FAILED",
        customerSafeRefundError(),
        error?.status || 502,
        { order: failedOrder }
      );
    }
  }

  try {
    const finalOrder = await finalizeCancellation({
      orderId: claimedOrder._id,
      actor,
      reason: normalizedReason,
      shiprocketCancelStatus,
    });

    return {
      order: finalOrder,
      shiprocketCancelStatus,
      stockRestored: true,
      refundStatus: finalOrder?.payment?.refundStatus,
      refundAmount: finalOrder?.payment?.refundAmount,
      refundedAt: finalOrder?.payment?.refundedAt,
    };
  } catch (error) {
    const failedOrder = await failClaimedCancellation(claimedOrder._id, {
      "cancellation.shiprocketCancelStatus": shiprocketCancelStatus,
      "cancellation.shiprocketCancelError":
        shiprocketCancelStatus === "failed" ? sanitizeError(error) : "",
      "stockRestoration.status": "failed",
      "stockRestoration.error": sanitizeError(error),
    });

    if (error instanceof CancellationError) {
      error.details = { ...(error.details || {}), order: failedOrder };
      throw error;
    }

    throw new CancellationError(
      "STOCK_RESTORE_FAILED",
      "Cancellation could not be completed. The order was not cancelled.",
      500,
      { order: failedOrder }
    );
  }
}

export async function retryOrderRefund({ orderId }) {
  await connectDB();

  const order = await loadOrder({ orderId });
  if (!isPrepaidRazorpay(order)) {
    throw new CancellationError(
      "REFUND_NOT_AVAILABLE",
      "Refund retry is only available for paid Razorpay orders.",
      400
    );
  }

  if (["refunded", "full"].includes(order.payment?.refundStatus)) {
    return {
      order,
      refundStatus: order.payment?.refundStatus,
      refundAmount: order.payment?.refundAmount,
      refundedAt: order.payment?.refundedAt,
      idempotent: true,
    };
  }

  const cancellationStatus = order.cancellation?.status;
  if (!["failed", "processing", "cancelled"].includes(cancellationStatus)) {
    throw new CancellationError(
      "REFUND_RETRY_NOT_ALLOWED",
      "Refund retry is not available for this order state.",
      409
    );
  }

  if (order.orderStatus !== "cancelled") {
    assertCancellable(order);

    const shiprocketCancelStatus =
      order.cancellation?.shiprocketCancelStatus || "not_required";
    if (!["cancelled", "not_required"].includes(shiprocketCancelStatus)) {
      throw new CancellationError(
        "SHIPROCKET_CANCEL_REQUIRED",
        "Cancel Shiprocket before retrying the refund.",
        409,
        { order }
      );
    }
  }

  let refundedOrder;
  try {
    refundedOrder = await processPrepaidRefund(order, {
      reason: order.cancellation?.reason || "Refund retry",
      actor: order.cancellation?.cancelledBy || "admin",
    });
  } catch (error) {
    const failedOrder =
      order.orderStatus === "cancelled"
        ? await Order.findById(order._id)
        : await failClaimedCancellation(order._id, {
            "cancellation.shiprocketCancelStatus":
              order.cancellation?.shiprocketCancelStatus || "not_required",
            "stockRestoration.status": "not_required",
            "stockRestoration.error": "",
          });

    if (error instanceof CancellationError) {
      error.details = { ...(error.details || {}), order: failedOrder };
      throw error;
    }

    throw new CancellationError(
      "RAZORPAY_REFUND_FAILED",
      customerSafeRefundError(),
      error?.status || 502,
      { order: failedOrder }
    );
  }

  if (refundedOrder.orderStatus === "cancelled") {
    return {
      order: refundedOrder,
      refundStatus: refundedOrder.payment?.refundStatus,
      refundAmount: refundedOrder.payment?.refundAmount,
      refundedAt: refundedOrder.payment?.refundedAt,
    };
  }

  const finalOrder = await finalizeCancellation({
    orderId: refundedOrder._id,
    actor: refundedOrder.cancellation?.cancelledBy || "admin",
    reason: refundedOrder.cancellation?.reason || "Refund retry",
    shiprocketCancelStatus:
      refundedOrder.cancellation?.shiprocketCancelStatus || "cancelled",
  });

  return {
    order: finalOrder,
    refundStatus: finalOrder.payment?.refundStatus,
    refundAmount: finalOrder.payment?.refundAmount,
    refundedAt: finalOrder.payment?.refundedAt,
    stockRestored: true,
  };
}
