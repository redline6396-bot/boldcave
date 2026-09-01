import mongoose from "mongoose";

import connectDB from "@/lib/db";
import {
  createRazorpayRefund,
  fetchRazorpayPayment,
  RazorpayRefundError,
} from "@/lib/payments/razorpay";
import { cleanString, isObjectId } from "@/lib/validation";
import Order from "@/models/Order";

const REFUND_IN_PROGRESS_STATUSES = new Set([
  "created",
  "pending",
  "needs_reconciliation",
]);
const REFUND_PROCESSED_STATUSES = new Set(["processed"]);
const SAFE_REFUND_FAILURE =
  "Your refund could not be completed automatically. Our team will review it.";

export class RefundServiceError extends Error {
  constructor(code, message, status = 400, details = undefined) {
    super(message);
    this.name = "RefundServiceError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function getOrderQuery(orderId) {
  return isObjectId(orderId)
    ? { _id: orderId }
    : { orderNumber: cleanString(orderId) };
}

function dateFromUnixSeconds(value) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0
    ? new Date(timestamp * 1000)
    : undefined;
}

function toRupees(paise) {
  return Math.round(Number(paise || 0)) / 100;
}

function toPaiseFromRupees(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function normalizeRefundStatus(status) {
  const normalized = cleanString(status).toLowerCase();
  if (normalized === "refunded") return "processed";
  if (normalized === "processing") return "pending";
  if (["created", "pending", "processed", "failed", "needs_reconciliation"].includes(normalized)) {
    return normalized;
  }
  return "pending";
}

function getRefunds(order) {
  return Array.isArray(order?.payment?.refunds) ? order.payment.refunds : [];
}

function getAmountPaid(order, payment = null) {
  const providerAmount = Number(payment?.amount);
  if (Number.isFinite(providerAmount) && providerAmount > 0) {
    return toRupees(providerAmount);
  }

  return roundMoney(
    order?.payment?.amountPaid ||
      order?.amounts?.finalAmount ||
      order?.payment?.refundAmount ||
      0
  );
}

function getLegacyRefundAmount(order) {
  if (getRefunds(order).length) return 0;
  const legacyStatus = cleanString(order?.payment?.refundStatus).toLowerCase();
  if (!["refunded", "partial", "full"].includes(legacyStatus)) return 0;
  return roundMoney(order?.payment?.refundAmount || 0);
}

function summarizeRefunds(order, amountPaid = getAmountPaid(order)) {
  const refunds = getRefunds(order);
  const processed = refunds.reduce((sum, refund) => {
    return REFUND_PROCESSED_STATUSES.has(normalizeRefundStatus(refund.status))
      ? sum + roundMoney(refund.amount)
      : sum;
  }, getLegacyRefundAmount(order));
  const active = refunds.reduce((sum, refund) => {
    const status = normalizeRefundStatus(refund.status);
    return status !== "failed" ? sum + roundMoney(refund.amount) : sum;
  }, getLegacyRefundAmount(order));
  const failed = refunds.some((refund) => normalizeRefundStatus(refund.status) === "failed");
  const needsReconciliation = refunds.some(
    (refund) => normalizeRefundStatus(refund.status) === "needs_reconciliation"
  );
  const storedRefunded = roundMoney(order?.payment?.amountRefunded || 0);
  const amountRefunded = Math.min(
    Math.max(roundMoney(processed), storedRefunded),
    amountPaid
  );
  const amountCommitted = Math.min(
    Math.max(roundMoney(active), amountRefunded),
    amountPaid
  );
  const remaining = Math.max(0, roundMoney(amountPaid - amountCommitted));
  let refundStatus = "none";

  if (needsReconciliation) {
    refundStatus = "needs_reconciliation";
  } else if (amountCommitted >= amountPaid && amountPaid > 0) {
    refundStatus = "full";
  } else if (amountCommitted > 0) {
    refundStatus = "partial";
  } else if (failed) {
    refundStatus = "failed";
  }

  return {
    amountPaid,
    amountRefunded,
    amountRefundPending: Math.max(0, roundMoney(amountCommitted - amountRefunded)),
    remainingRefundableAmount: remaining,
    refundStatus,
  };
}

function applyRefundSummary(order, amountPaid = getAmountPaid(order)) {
  const summary = summarizeRefunds(order, amountPaid);
  order.payment.amountPaid = summary.amountPaid;
  order.payment.amountRefunded = summary.amountRefunded;
  order.payment.amountRefundPending = summary.amountRefundPending;
  order.payment.remainingRefundableAmount = summary.remainingRefundableAmount;
  order.payment.refundStatus = summary.refundStatus;
  order.payment.refundLastCheckedAt = new Date();

  const latestRefund = getRefunds(order).at(-1);
  if (latestRefund) {
    order.payment.razorpayRefundId = latestRefund.razorpayRefundId || "";
    order.payment.refundAmount = summary.amountRefunded || roundMoney(latestRefund.amount);
    order.payment.refundIdempotencyKey = latestRefund.idempotencyKey;
    order.payment.refundInitiatedAt =
      latestRefund.providerCreatedAt || latestRefund.createdAt || new Date();
    order.payment.refundError = latestRefund.error || "";
    if (summary.refundStatus === "full" && summary.amountRefunded >= summary.amountPaid) {
      order.payment.refundedAt = latestRefund.processedAt || new Date();
    } else {
      order.payment.refundedAt = undefined;
    }
  }

  return summary;
}

function assertRefundableOrder(order) {
  if (order?.payment?.method !== "razorpay") {
    throw new RefundServiceError(
      "REFUND_NOT_AVAILABLE",
      "Razorpay refund is only available for paid Razorpay orders.",
      400
    );
  }

  if (order.payment?.paymentStatus !== "paid") {
    throw new RefundServiceError(
      "PAYMENT_NOT_PAID",
      "Refund is available only after payment is confirmed.",
      409
    );
  }

  if (!cleanString(order.payment?.razorpayPaymentId)) {
    throw new RefundServiceError(
      "RAZORPAY_PAYMENT_ID_MISSING",
      "Refund cannot be started for this payment.",
      409
    );
  }
}

function assertCapturedProviderPayment(order, payment) {
  if (
    cleanString(payment?.id) !== cleanString(order.payment?.razorpayPaymentId) ||
    cleanString(payment?.order_id) !== cleanString(order.payment?.razorpayOrderId)
  ) {
    throw new RefundServiceError(
      "PAYMENT_RECONCILIATION_REQUIRED",
      "Refund cannot be started until this payment is reconciled.",
      409
    );
  }

  if (cleanString(payment?.currency).toUpperCase() !== "INR") {
    throw new RefundServiceError(
      "PAYMENT_CURRENCY_UNSUPPORTED",
      "Refund is available only for INR payments.",
      409
    );
  }

  if (cleanString(payment?.status).toLowerCase() !== "captured" || payment?.captured !== true) {
    throw new RefundServiceError(
      "PAYMENT_NOT_CAPTURED",
      "Refund is available only for captured payments.",
      409
    );
  }
}

function makeRefundIdempotencyKey(refundId) {
  return `rfnd_${String(refundId).replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

function buildRefundBody({ order, amountPaise, idempotencyKey, reason, actor }) {
  return {
    amount: amountPaise,
    speed: "normal",
    receipt: idempotencyKey,
    notes: {
      orderNumber: order.orderNumber,
      orderId: String(order._id),
      refundIdempotencyKey: idempotencyKey,
      actor,
      reason: reason || "Admin refund",
    },
  };
}

function updateRefundFromProvider(refundEntry, providerRefund, fallback = {}) {
  const status = normalizeRefundStatus(providerRefund?.status);
  refundEntry.razorpayRefundId = cleanString(providerRefund?.id) || refundEntry.razorpayRefundId;
  refundEntry.amount = toRupees(providerRefund?.amount || fallback.amountPaise);
  refundEntry.currency = cleanString(providerRefund?.currency).toUpperCase() || "INR";
  refundEntry.status = status;
  refundEntry.error = status === "failed" ? SAFE_REFUND_FAILURE : "";
  refundEntry.providerCreatedAt =
    dateFromUnixSeconds(providerRefund?.created_at) || refundEntry.providerCreatedAt;

  if (status === "processed") {
    refundEntry.processedAt = new Date();
    refundEntry.failedAt = undefined;
  } else if (status === "failed") {
    refundEntry.failedAt = new Date();
    refundEntry.processedAt = undefined;
  }
}

async function lockOrderForRefund(orderId) {
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000);
  return Order.findOneAndUpdate(
    {
      _id: orderId,
      $or: [
        { "payment.refundLockedAt": { $exists: false } },
        { "payment.refundLockedAt": null },
        { "payment.refundLockedAt": { $lt: staleBefore } },
      ],
    },
    { $set: { "payment.refundLockedAt": new Date() } },
    { returnDocument: "after" }
  );
}

async function unlockOrderRefund(orderId) {
  await Order.findByIdAndUpdate(orderId, {
    $unset: { "payment.refundLockedAt": "" },
  });
}

export function getRemainingRefundableAmount(order) {
  return summarizeRefunds(order).remainingRefundableAmount;
}

export async function createOrderRefund({
  orderId,
  amount,
  reason = "",
  actor = "admin",
  requireAdmin = true,
}) {
  await connectDB();

  const originalOrder = await Order.findOne(getOrderQuery(orderId));
  if (!originalOrder) {
    throw new RefundServiceError("ORDER_NOT_FOUND", "Order not found", 404);
  }

  if (requireAdmin && actor !== "admin") {
    throw new RefundServiceError("ADMIN_REQUIRED", "Admin access required.", 403);
  }

  assertRefundableOrder(originalOrder);

  const lockedOrder = await lockOrderForRefund(originalOrder._id);
  if (!lockedOrder) {
    throw new RefundServiceError(
      "REFUND_IN_PROGRESS",
      "A refund is already being processed for this order.",
      409
    );
  }

  let refundEntry = null;
  try {
    const order = await Order.findById(lockedOrder._id);
    const providerPayment = await fetchRazorpayPayment(order.payment.razorpayPaymentId);
    assertCapturedProviderPayment(order, providerPayment);

    const amountPaid = getAmountPaid(order, providerPayment);
    const providerAmountRefundedPaise = Math.max(
      0,
      Math.round(Number(providerPayment.amount_refunded) || 0)
    );
    const providerRemainingPaise = Math.max(
      0,
      Math.round(Number(providerPayment.amount) || 0) - providerAmountRefundedPaise
    );
    order.payment.razorpayPaymentStatus = providerPayment.status;
    order.payment.amountPaid = amountPaid;
    order.payment.currency = cleanString(providerPayment.currency).toUpperCase() || "INR";

    const summary = applyRefundSummary(order, amountPaid);
    const localRemainingPaise = Math.round(summary.remainingRefundableAmount * 100);
    const remainingRefundablePaise = Math.min(
      localRemainingPaise,
      providerRemainingPaise
    );

    if (providerAmountRefundedPaise > Math.round(summary.amountRefunded * 100)) {
      order.payment.amountRefunded = toRupees(providerAmountRefundedPaise);
      order.payment.remainingRefundableAmount = toRupees(remainingRefundablePaise);
      order.payment.refundStatus =
        remainingRefundablePaise <= 0 ? "full" : "partial";
    }

    if (remainingRefundablePaise <= 0) {
      throw new RefundServiceError(
        "PAYMENT_ALREADY_FULLY_REFUNDED",
        "This payment has already been fully refunded.",
        409
      );
    }

    const requestedAmountPaise =
      amount === undefined || amount === null || amount === ""
        ? remainingRefundablePaise
        : toPaiseFromRupees(amount);

    if (!Number.isFinite(requestedAmountPaise) || requestedAmountPaise <= 0) {
      throw new RefundServiceError(
        "REFUND_AMOUNT_INVALID",
        "Refund amount must be greater than zero.",
        400
      );
    }

    if (requestedAmountPaise < 100) {
      throw new RefundServiceError(
        "REFUND_AMOUNT_TOO_SMALL",
        "Refund amount must be at least INR 1.",
        400
      );
    }

    if (requestedAmountPaise > remainingRefundablePaise) {
      throw new RefundServiceError(
        "REFUND_AMOUNT_EXCEEDS_REMAINING",
        "Refund amount exceeds the remaining refundable amount.",
        409
      );
    }

    const duplicateInProgress = getRefunds(order).find((refund) => {
      return (
        REFUND_IN_PROGRESS_STATUSES.has(normalizeRefundStatus(refund.status)) &&
        Math.round(roundMoney(refund.amount) * 100) === requestedAmountPaise
      );
    });

    if (duplicateInProgress) {
      applyRefundSummary(order, amountPaid);
      await order.save();
      return { order, refund: duplicateInProgress, idempotent: true };
    }

    const refundId = new mongoose.Types.ObjectId();
    const idempotencyKey = makeRefundIdempotencyKey(refundId);
    const refundBody = buildRefundBody({
      order,
      amountPaise: requestedAmountPaise,
      idempotencyKey,
      reason,
      actor,
    });

    refundEntry = {
      _id: refundId,
      amount: toRupees(requestedAmountPaise),
      currency: "INR",
      status: "created",
      idempotencyKey,
      reason: cleanString(reason).slice(0, 300),
      note:
        requestedAmountPaise === remainingRefundablePaise
          ? "Full remaining refund"
          : "Partial refund",
      error: "",
    };

    order.payment.refunds = [...getRefunds(order), refundEntry];
    applyRefundSummary(order, amountPaid);
    await order.save();

    let providerRefund;
    try {
      providerRefund = await createRazorpayRefund({
        razorpayPaymentId: order.payment.razorpayPaymentId,
        amountPaise: requestedAmountPaise,
        idempotencyKey,
        body: refundBody,
      });
    } catch (error) {
      const refreshedOrder = await Order.findById(order._id);
      const savedRefund = getRefunds(refreshedOrder).find(
        (refund) => refund.idempotencyKey === idempotencyKey
      );
      if (savedRefund) {
        savedRefund.status = "needs_reconciliation";
        savedRefund.error = SAFE_REFUND_FAILURE;
      }
      applyRefundSummary(refreshedOrder, amountPaid);
      await refreshedOrder.save();

      throw new RefundServiceError(
        "RAZORPAY_REFUND_RECONCILIATION_REQUIRED",
        "Refund status is being reconciled. Do not retry with a new request.",
        error?.status || 502,
        { order: refreshedOrder }
      );
    }

    const refreshedOrder = await Order.findById(order._id);
    const savedRefund = getRefunds(refreshedOrder).find(
      (refund) => refund.idempotencyKey === idempotencyKey
    );
    if (savedRefund) {
      updateRefundFromProvider(savedRefund, providerRefund, {
        amountPaise: requestedAmountPaise,
      });
    }
    applyRefundSummary(refreshedOrder, amountPaid);
    await refreshedOrder.save();

    if (savedRefund?.status === "failed") {
      throw new RefundServiceError(
        "RAZORPAY_REFUND_FAILED",
        SAFE_REFUND_FAILURE,
        502,
        { order: refreshedOrder }
      );
    }

    return { order: refreshedOrder, refund: savedRefund, idempotent: false };
  } finally {
    await unlockOrderRefund(originalOrder._id);
  }
}

export async function refundRemainingForCancellation({ order, reason, actor }) {
  const remaining = getRemainingRefundableAmount(order);
  if (remaining <= 0) {
    return { order, refundStatus: order.payment?.refundStatus, idempotent: true };
  }

  try {
    return await createOrderRefund({
      orderId: order._id,
      amount: remaining,
      reason,
      actor,
      requireAdmin: false,
    });
  } catch (error) {
    if (error instanceof RefundServiceError) throw error;
    if (error instanceof RazorpayRefundError) {
      throw new RefundServiceError(
        "RAZORPAY_REFUND_FAILED",
        SAFE_REFUND_FAILURE,
        error.status || 502
      );
    }
    throw error;
  }
}

export async function applyRazorpayRefundWebhook({ eventName, refund, paymentId }) {
  await connectDB();

  const refundId = cleanString(refund?.id);
  const providerPaymentId = cleanString(refund?.payment_id || paymentId);
  const query = {
    "payment.method": "razorpay",
    $or: [
      ...(refundId ? [{ "payment.refunds.razorpayRefundId": refundId }] : []),
      ...(refundId ? [{ "payment.razorpayRefundId": refundId }] : []),
      ...(providerPaymentId ? [{ "payment.razorpayPaymentId": providerPaymentId }] : []),
    ],
  };

  const order = await Order.findOne(query);
  if (!order) return { order: null, updated: false };

  const refundStatus =
    eventName === "refund.failed"
      ? "failed"
      : eventName === "refund.processed"
        ? "processed"
        : normalizeRefundStatus(refund?.status);
  let refundEntry = getRefunds(order).find(
    (entry) => cleanString(entry.razorpayRefundId) === refundId
  );

  if (!refundEntry) {
    order.payment.refunds = getRefunds(order);
    order.payment.refunds.push({
      razorpayRefundId: refundId,
      amount: toRupees(refund?.amount),
      currency: cleanString(refund?.currency).toUpperCase() || "INR",
      status: refundStatus,
      idempotencyKey: cleanString(refund?.receipt) || `webhook_${refundId}`,
      reason: "Razorpay webhook",
      error: "",
      providerCreatedAt: dateFromUnixSeconds(refund?.created_at),
    });
    refundEntry = order.payment.refunds.at(-1);
  }

  updateRefundFromProvider(
    refundEntry,
    { ...refund, status: refundStatus },
    { amountPaise: refund?.amount }
  );
  applyRefundSummary(order);
  await order.save();

  return { order, updated: true };
}
