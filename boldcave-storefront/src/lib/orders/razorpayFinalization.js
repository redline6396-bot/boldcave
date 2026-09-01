import {
  consumeCouponUsageForOrder,
  deductStock,
} from "@/lib/orders/pricing";
import { syncShipment } from "@/lib/shipping";
import Order from "@/models/Order";
import RazorpayAttempt from "@/models/RazorpayAttempt";

export const PAYMENT_CONFIRMATION_PENDING_MESSAGE =
  "We're confirming your payment. Please don't make another payment right now.";

export const PAYMENT_VERIFICATION_FAILED_MESSAGE =
  "We couldn't confirm your payment right now. Please contact support if the amount was deducted.";

const FINAL_ATTEMPT_STATUSES = ["paid"];
const CLAIMABLE_ATTEMPT_STATUSES = [
  "created",
  "failed",
  "pending_capture",
  "needs_reconciliation",
];

export class RazorpayPaymentVerificationError extends Error {
  constructor(code, message, status = 400, details = undefined) {
    super(message);
    this.name = "RazorpayPaymentVerificationError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function amountToPaise(amount) {
  return Math.round(Number(amount || 0) * 100);
}

export function getExpectedRazorpayAmountPaise(attempt) {
  return amountToPaise(attempt?.amounts?.finalAmount);
}

function cleanString(value) {
  return String(value || "").trim();
}

function getPaymentSnapshot(payment) {
  return {
    razorpayPaymentId: cleanString(payment?.id),
    razorpayPaymentStatus: cleanString(payment?.status),
    razorpayPaymentCaptured: Boolean(payment?.captured),
    razorpayPaymentAmount: Number(payment?.amount) || 0,
    razorpayPaymentCurrency: cleanString(payment?.currency).toUpperCase(),
  };
}

export function validateCapturedPaymentForAttempt({
  attempt,
  payment,
  razorpayOrderId,
  razorpayPaymentId,
}) {
  const expectedAmountPaise = getExpectedRazorpayAmountPaise(attempt);
  const snapshot = getPaymentSnapshot(payment);
  const submittedPaymentId = cleanString(razorpayPaymentId);
  const submittedOrderId = cleanString(razorpayOrderId);
  const paymentOrderId = cleanString(payment?.order_id);

  if (
    snapshot.razorpayPaymentId !== submittedPaymentId ||
    paymentOrderId !== submittedOrderId ||
    submittedOrderId !== cleanString(attempt?.razorpayOrderId)
  ) {
    throw new RazorpayPaymentVerificationError(
      "PAYMENT_RECONCILIATION_REQUIRED",
      PAYMENT_VERIFICATION_FAILED_MESSAGE,
      409,
      { reason: "identity_mismatch", snapshot }
    );
  }

  if (snapshot.razorpayPaymentCurrency !== "INR") {
    throw new RazorpayPaymentVerificationError(
      "PAYMENT_RECONCILIATION_REQUIRED",
      PAYMENT_VERIFICATION_FAILED_MESSAGE,
      409,
      { reason: "currency_mismatch", snapshot }
    );
  }

  if (snapshot.razorpayPaymentAmount !== expectedAmountPaise) {
    throw new RazorpayPaymentVerificationError(
      "PAYMENT_RECONCILIATION_REQUIRED",
      PAYMENT_VERIFICATION_FAILED_MESSAGE,
      409,
      { reason: "amount_mismatch", snapshot, expectedAmountPaise }
    );
  }

  if (
    snapshot.razorpayPaymentStatus === "authorized" ||
    snapshot.razorpayPaymentCaptured === false
  ) {
    throw new RazorpayPaymentVerificationError(
      "PAYMENT_CONFIRMATION_PENDING",
      PAYMENT_CONFIRMATION_PENDING_MESSAGE,
      202,
      { reason: "not_captured", snapshot }
    );
  }

  if (
    snapshot.razorpayPaymentStatus !== "captured" ||
    snapshot.razorpayPaymentCaptured !== true
  ) {
    throw new RazorpayPaymentVerificationError(
      "PAYMENT_RECONCILIATION_REQUIRED",
      PAYMENT_VERIFICATION_FAILED_MESSAGE,
      409,
      { reason: "not_successful", snapshot }
    );
  }

  return snapshot;
}

export async function persistAttemptPaymentState(
  attempt,
  { status, failureReason = "", reconciliationReason = "", payment = {} }
) {
  const snapshot = getPaymentSnapshot(payment);
  attempt.status = status;
  attempt.failureReason = failureReason;
  attempt.reconciliationReason = reconciliationReason;
  Object.assign(attempt, snapshot);
  await attempt.save();
  return attempt;
}

async function findExistingOrderForAttempt(attempt) {
  if (attempt.finalOrder) {
    const finalOrder = await Order.findById(attempt.finalOrder);
    if (finalOrder) return finalOrder;
  }

  return Order.findOne({
    orderNumber: attempt.orderNumber,
    user: attempt.user,
  });
}

async function markAttemptPaid(attempt, { order, payment, razorpaySignature }) {
  const snapshot = getPaymentSnapshot(payment);
  attempt.status = "paid";
  attempt.finalOrder = order._id;
  attempt.razorpayPaymentId = snapshot.razorpayPaymentId;
  attempt.razorpaySignature = razorpaySignature || attempt.razorpaySignature || "";
  attempt.failureReason = "";
  attempt.reconciliationReason = "";
  Object.assign(attempt, snapshot);
  await attempt.save();
}

async function persistShippingFailure(order, error) {
  const update = {
    $set: {
      orderStatus:
        order.orderStatus === "confirmed" ? "shipping_pending" : order.orderStatus,
    },
  };

  const provider = cleanString(order.shippingProvider);
  if (provider === "shiprocket") {
    update.$set["shiprocket.syncStatus"] = "failed";
    update.$set["shiprocket.lastError"] = cleanString(error?.message).slice(0, 300);
    update.$set["shiprocket.lastAttemptAt"] = new Date();
  } else if (provider === "shadowfax") {
    update.$set["shadowfax.syncStatus"] = "failed";
    update.$set["shadowfax.lastError"] = cleanString(error?.message).slice(0, 300);
    update.$set["shadowfax.lastAttemptAt"] = new Date();
  }

  return Order.findByIdAndUpdate(order._id, update, { returnDocument: "after" });
}

export async function finalizeCapturedRazorpayAttempt({
  attempt,
  payment,
  razorpaySignature = "",
  shippingProvider,
  runShipping = true,
}) {
  if (FINAL_ATTEMPT_STATUSES.includes(attempt.status) && attempt.finalOrder) {
    const existingFinalOrder = await findExistingOrderForAttempt(attempt);
    if (existingFinalOrder) return { order: existingFinalOrder, idempotent: true };
  }

  const existingOrder = await findExistingOrderForAttempt(attempt);
  if (existingOrder) {
    await markAttemptPaid(attempt, {
      order: existingOrder,
      payment,
      razorpaySignature,
    });
    return { order: existingOrder, idempotent: true };
  }

  const claimedAttempt = await RazorpayAttempt.findOneAndUpdate(
    {
      _id: attempt._id,
      status: { $in: CLAIMABLE_ATTEMPT_STATUSES },
      finalOrder: null,
    },
    {
      $set: {
        status: "verifying",
        failureReason: "",
        reconciliationReason: "",
        ...getPaymentSnapshot(payment),
        razorpaySignature: razorpaySignature || attempt.razorpaySignature || "",
      },
    },
    { returnDocument: "after" }
  );

  if (!claimedAttempt) {
    const latestAttempt = await RazorpayAttempt.findById(attempt._id);
    const latestOrder = latestAttempt
      ? await findExistingOrderForAttempt(latestAttempt)
      : null;
    if (latestOrder) return { order: latestOrder, idempotent: true };

    throw new RazorpayPaymentVerificationError(
      "PAYMENT_VERIFICATION_IN_PROGRESS",
      "Payment verification is already in progress",
      409
    );
  }

  try {
    await deductStock(claimedAttempt.items);
  } catch (error) {
    if (error.code === "STOCK_CHANGED") {
      await persistAttemptPaymentState(claimedAttempt, {
        status: "needs_reconciliation",
        reconciliationReason: "stock_changed_after_payment_capture",
        payment,
      });
      throw new RazorpayPaymentVerificationError(
        "PAYMENT_CONFIRMATION_PENDING",
        PAYMENT_CONFIRMATION_PENDING_MESSAGE,
        202,
        { items: error.items }
      );
    }
    throw error;
  }

  let order = await Order.create({
    orderNumber: claimedAttempt.orderNumber,
    user: claimedAttempt.user,
    customer: claimedAttempt.customer,
    deliveryAddress: claimedAttempt.deliveryAddress,
    items: claimedAttempt.items,
    amounts: claimedAttempt.amounts,
    coupon: claimedAttempt.coupon,
    payment: {
      method: "razorpay",
      paymentStatus: "paid",
      razorpayOrderId: claimedAttempt.razorpayOrderId,
      razorpayPaymentId: payment.id,
      razorpaySignature: razorpaySignature || claimedAttempt.razorpaySignature || "",
      razorpayPaymentStatus: payment.status,
      razorpayCapturedAt: payment.created_at
        ? new Date(Number(payment.created_at) * 1000)
        : new Date(),
      amountPaid: Math.round(Number(payment.amount || 0)) / 100,
      amountRefunded: 0,
      amountRefundPending: 0,
      remainingRefundableAmount: Math.round(Number(payment.amount || 0)) / 100,
      currency: cleanString(payment.currency).toUpperCase() || "INR",
      refundStatus: "none",
    },
    orderStatus: "confirmed",
    shippingProvider,
  });

  await markAttemptPaid(claimedAttempt, { order, payment, razorpaySignature });

  await consumeCouponUsageForOrder({
    coupon: claimedAttempt.coupon,
    userId: claimedAttempt.user,
    order,
  });

  if (!runShipping) {
    return { order, idempotent: false };
  }

  try {
    const shipmentSync = await syncShipment(order);
    order = shipmentSync.order || order;
    return { order, shipmentSync, idempotent: false };
  } catch (error) {
    const shippingPendingOrder = await persistShippingFailure(order, error);
    return {
      order: shippingPendingOrder || order,
      shippingError: true,
      idempotent: false,
    };
  }
}
