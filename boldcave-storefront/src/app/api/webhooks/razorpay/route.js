import connectDB from "@/lib/db";
import { failure, success } from "@/lib/api/response";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import {
  finalizeCapturedRazorpayAttempt,
  persistAttemptPaymentState,
  RazorpayPaymentVerificationError,
  validateCapturedPaymentForAttempt,
} from "@/lib/orders/razorpayFinalization";
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay";
import { applyRazorpayRefundWebhook } from "@/lib/payments/refunds";
import { SHIPPING_PROVIDERS } from "@/lib/shipping";
import RazorpayAttempt from "@/models/RazorpayAttempt";

export const runtime = "nodejs";

const PAYMENT_EVENTS = new Set(["payment.captured", "payment.failed", "order.paid"]);
const REFUND_EVENTS = new Set(["refund.created", "refund.processed", "refund.failed"]);

function cleanString(value) {
  return String(value || "").trim();
}

function getPaymentEntity(event) {
  return event?.payload?.payment?.entity || {};
}

function getOrderEntity(event) {
  return event?.payload?.order?.entity || {};
}

function getRazorpayOrderId(event) {
  const payment = getPaymentEntity(event);
  const order = getOrderEntity(event);
  return cleanString(payment.order_id || order.id);
}

function getSafeFailureReason(payment) {
  return cleanString(
    payment?.error_reason ||
      payment?.error_code ||
      payment?.status ||
      "payment_failed"
  ).slice(0, 120);
}

async function findAttemptForEvent(event) {
  const payment = getPaymentEntity(event);
  const orderId = getRazorpayOrderId(event);
  const paymentId = cleanString(payment.id);
  const query = {
    $or: [
      ...(orderId ? [{ razorpayOrderId: orderId }] : []),
      ...(paymentId ? [{ razorpayPaymentId: paymentId }] : []),
    ],
  };

  if (!query.$or.length) return null;
  return RazorpayAttempt.findOne(query);
}

async function handlePaymentFailed(event) {
  const attempt = await findAttemptForEvent(event);
  if (!attempt) return { updated: false };
  if (attempt.status === "paid" || attempt.finalOrder) {
    return { updated: false, stale: true };
  }

  await persistAttemptPaymentState(attempt, {
    status: "failed",
    failureReason: getSafeFailureReason(getPaymentEntity(event)),
    payment: getPaymentEntity(event),
  });
  return { updated: true };
}

async function handlePaymentCaptured(event) {
  const attempt = await findAttemptForEvent(event);
  if (!attempt) return { updated: false };
  if (attempt.status === "paid" && attempt.finalOrder) {
    return { updated: false, idempotent: true };
  }

  const payment = getPaymentEntity(event);
  if (!cleanString(payment.id)) {
    await persistAttemptPaymentState(attempt, {
      status: "needs_reconciliation",
      reconciliationReason: "webhook_payment_entity_missing",
      payment: {},
    });
    return { updated: true, needsReconciliation: true };
  }

  try {
    validateCapturedPaymentForAttempt({
      attempt,
      payment,
      razorpayOrderId: payment.order_id,
      razorpayPaymentId: payment.id,
    });
  } catch (error) {
    if (!(error instanceof RazorpayPaymentVerificationError)) throw error;

    await persistAttemptPaymentState(attempt, {
      status:
        error.code === "PAYMENT_CONFIRMATION_PENDING"
          ? "pending_capture"
          : "needs_reconciliation",
      reconciliationReason: error.details?.reason || error.code,
      payment,
    });

    return { updated: true, needsReconciliation: true };
  }

  let result;
  try {
    result = await finalizeCapturedRazorpayAttempt({
      attempt,
      payment,
      razorpaySignature: attempt.razorpaySignature,
      shippingProvider: attempt.shippingProvider || SHIPPING_PROVIDERS.SHIPROCKET,
    });
  } catch (error) {
    if (!(error instanceof RazorpayPaymentVerificationError)) throw error;

    await persistAttemptPaymentState(attempt, {
      status: "needs_reconciliation",
      reconciliationReason: error.details?.reason || error.code,
      payment,
    });
    return { updated: true, needsReconciliation: true };
  }

  return {
    updated: true,
    idempotent: Boolean(result.idempotent),
    finalOrderId: result.order?._id ? String(result.order._id) : "",
  };
}

async function handleOrderPaid(event) {
  const payment = getPaymentEntity(event);
  if (cleanString(payment.id)) {
    return handlePaymentCaptured(event);
  }

  const attempt = await findAttemptForEvent(event);
  if (!attempt) return { updated: false };
  if (attempt.status === "paid" && attempt.finalOrder) {
    return { updated: false, idempotent: true };
  }

  await persistAttemptPaymentState(attempt, {
    status: "needs_reconciliation",
    reconciliationReason: "order_paid_without_payment_entity",
    payment: {
      id: attempt.razorpayPaymentId,
      order_id: attempt.razorpayOrderId,
      status: getOrderEntity(event)?.status,
      amount: getOrderEntity(event)?.amount_paid,
      currency: getOrderEntity(event)?.currency,
    },
  });

  return { updated: true, needsReconciliation: true };
}

export async function POST(request) {
  return withRuntimeDatabase(() => razorpayWebhookRoute(request));
}

async function razorpayWebhookRoute(request) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    return failure(
      "RAZORPAY_WEBHOOK_NOT_CONFIGURED",
      "Razorpay webhook is not configured.",
      503
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") || "";

  if (
    !verifyRazorpayWebhookSignature({
      rawBody,
      signature,
      secret: process.env.RAZORPAY_WEBHOOK_SECRET,
    })
  ) {
    return failure("INVALID_WEBHOOK_SIGNATURE", "Invalid webhook signature.", 400);
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return failure("INVALID_WEBHOOK_BODY", "Invalid webhook body.", 400);
  }

  const eventName = cleanString(event?.event);
  if (!PAYMENT_EVENTS.has(eventName) && !REFUND_EVENTS.has(eventName)) {
    return success({ ignored: true });
  }

  await connectDB();

  if (eventName === "payment.failed") {
    return success({
      received: true,
      event: eventName,
      ...(await handlePaymentFailed(event)),
    });
  }

  if (eventName === "payment.captured") {
    return success({
      received: true,
      event: eventName,
      ...(await handlePaymentCaptured(event)),
    });
  }

  if (eventName === "order.paid") {
    return success({
      received: true,
      event: eventName,
      ...(await handleOrderPaid(event)),
    });
  }

  const refund = event?.payload?.refund?.entity || {};
  const payment = event?.payload?.payment?.entity || {};
  const result = await applyRazorpayRefundWebhook({
    eventName,
    refund,
    paymentId: payment.id,
  });

  return success({
    received: true,
    event: eventName,
    updated: Boolean(result.updated),
  });
}
