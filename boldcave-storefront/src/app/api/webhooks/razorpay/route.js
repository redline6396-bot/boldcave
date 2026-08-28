import connectDB from "@/lib/db";
import { failure, success } from "@/lib/api/response";
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay";
import Order from "@/models/Order";

export const runtime = "nodejs";

function mapRefundStatus(eventName, refundStatus) {
  const normalizedEvent = String(eventName || "").toLowerCase();
  const normalizedStatus = String(refundStatus || "").toLowerCase();

  if (normalizedEvent === "refund.processed" || normalizedStatus === "processed") {
    return "refunded";
  }

  if (normalizedEvent === "refund.failed" || normalizedStatus === "failed") {
    return "failed";
  }

  return "pending";
}

function getRefundAmount(refund) {
  const amount = Number(refund?.amount);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount) / 100 : undefined;
}

function dateFromUnixSeconds(value) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0
    ? new Date(timestamp * 1000)
    : undefined;
}

function buildRefundUpdate(eventName, refund) {
  const refundStatus = mapRefundStatus(eventName, refund?.status);
  const now = new Date();
  const set = {
    "payment.refundStatus": refundStatus,
    "payment.refundLastCheckedAt": now,
    "payment.refundError":
      refundStatus === "failed"
        ? "Your refund could not be completed automatically. Our team will review it."
        : "",
  };
  const unset = {};

  if (refund?.id) set["payment.razorpayRefundId"] = refund.id;
  if (refund?.receipt) set["payment.refundIdempotencyKey"] = refund.receipt;

  const refundAmount = getRefundAmount(refund);
  if (refundAmount !== undefined) set["payment.refundAmount"] = refundAmount;

  const createdAt = dateFromUnixSeconds(refund?.created_at);
  if (createdAt) set["payment.refundInitiatedAt"] = createdAt;

  if (refundStatus === "refunded") {
    set["payment.refundedAt"] = now;
  } else {
    unset["payment.refundedAt"] = "";
  }

  const update = { $set: set };
  if (Object.keys(unset).length) update.$unset = unset;
  return update;
}

export async function POST(request) {
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

  const eventName = String(event?.event || "");
  if (!["refund.created", "refund.processed", "refund.failed"].includes(eventName)) {
    return success({ ignored: true });
  }

  const refund = event?.payload?.refund?.entity || {};
  const payment = event?.payload?.payment?.entity || {};
  const refundId = String(refund.id || "").trim();
  const paymentId = String(refund.payment_id || payment.id || "").trim();

  if (!refundId && !paymentId) {
    return failure("WEBHOOK_REFUND_IDENTIFIER_MISSING", "Refund identifier missing.", 400);
  }

  await connectDB();

  const query = {
    "payment.method": "razorpay",
    $or: [
      ...(refundId ? [{ "payment.razorpayRefundId": refundId }] : []),
      ...(paymentId ? [{ "payment.razorpayPaymentId": paymentId }] : []),
    ],
  };

  const existingOrder = await Order.findOne(query);
  if (!existingOrder) {
    return success({
      received: true,
      updated: false,
    });
  }

  const nextRefundStatus = mapRefundStatus(eventName, refund?.status);
  const currentRefundStatus = existingOrder.payment?.refundStatus;
  const shouldIgnoreStaleEvent =
    currentRefundStatus === "refunded" ||
    (currentRefundStatus === "failed" && nextRefundStatus === "pending");

  if (shouldIgnoreStaleEvent) {
    return success({
      received: true,
      updated: false,
      stale: true,
    });
  }

  const order = await Order.findByIdAndUpdate(
    existingOrder._id,
    buildRefundUpdate(eventName, refund),
    { returnDocument: "after" }
  );

  return success({
    received: true,
    updated: Boolean(order),
  });
}
