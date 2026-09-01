import connectDB from "@/lib/db";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/session";
import { syncUserProfileFromCheckoutAddress } from "@/lib/auth/users";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import {
  finalizeCapturedRazorpayAttempt,
  PAYMENT_VERIFICATION_FAILED_MESSAGE,
  persistAttemptPaymentState,
  RazorpayPaymentVerificationError,
  validateCapturedPaymentForAttempt,
} from "@/lib/orders/razorpayFinalization";
import {
  fetchRazorpayPayment,
  verifyRazorpaySignature,
} from "@/lib/payments/razorpay";
import { SHIPPING_PROVIDERS } from "@/lib/shipping";
import { isAcceptingOrders } from "@/lib/storeSettings";
import RazorpayAttempt from "@/models/RazorpayAttempt";

export const runtime = "nodejs";

export async function POST(request) {
  return withRuntimeDatabase(() => verifyRazorpayOrderRoute(request));
}

async function verifyRazorpayOrderRoute(request) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;

    await connectDB();
    const body = await readJson(request);
    const attemptId = body.attemptId || body.orderId || body.internalOrderId;

    const attempt = await RazorpayAttempt.findOne({
      _id: attemptId,
      user: auth.user._id,
    });
    if (!attempt) {
      return failure("PAYMENT_ATTEMPT_NOT_FOUND", "Payment attempt not found", 404);
    }

    if (attempt.status === "paid" && attempt.finalOrder) {
      const existingOrder = await attempt.populate("finalOrder").then((doc) => doc.finalOrder);
      if (existingOrder) {
        return success({ order: existingOrder, idempotent: true });
      }
    }

    if (attempt.razorpayOrderId !== body.razorpay_order_id) {
      return failure("PAYMENT_MISMATCH", "Payment does not match this order", 400);
    }

    const verified = verifyRazorpaySignature({
      razorpayOrderId: body.razorpay_order_id,
      razorpayPaymentId: body.razorpay_payment_id,
      razorpaySignature: body.razorpay_signature,
    });

    if (!verified) {
      attempt.status = "failed";
      attempt.failureReason = "signature_verification_failed";
      attempt.razorpayPaymentId = body.razorpay_payment_id;
      attempt.razorpaySignature = body.razorpay_signature;
      await attempt.save();
      return failure("PAYMENT_VERIFICATION_FAILED", "Payment verification failed", 400);
    }

    let payment;
    try {
      payment = await fetchRazorpayPayment(body.razorpay_payment_id);
    } catch {
      await persistAttemptPaymentState(attempt, {
        status: "needs_reconciliation",
        reconciliationReason: "payment_fetch_failed",
        payment: { id: body.razorpay_payment_id },
      });
      return failure(
        "PAYMENT_CONFIRMATION_PENDING",
        "We're confirming your payment. Please don't make another payment right now.",
        202
      );
    }

    try {
      validateCapturedPaymentForAttempt({
        attempt,
        payment,
        razorpayOrderId: body.razorpay_order_id,
        razorpayPaymentId: body.razorpay_payment_id,
      });
    } catch (error) {
      if (!(error instanceof RazorpayPaymentVerificationError)) throw error;

      const isPending = error.code === "PAYMENT_CONFIRMATION_PENDING";
      await persistAttemptPaymentState(attempt, {
        status: isPending ? "pending_capture" : "needs_reconciliation",
        reconciliationReason: error.details?.reason || error.code,
        payment,
      });

      return failure(
        error.code,
        error.message || PAYMENT_VERIFICATION_FAILED_MESSAGE,
        error.status
      );
    }

    if (!(await isAcceptingOrders())) {
      return failure(
        "ORDERS_DISABLED",
        "We are currently not accepting orders. Please check back soon.",
        423
      );
    }

    const result = await finalizeCapturedRazorpayAttempt({
      attempt,
      payment,
      razorpaySignature: body.razorpay_signature,
      shippingProvider:
        attempt.shippingProvider || SHIPPING_PROVIDERS.SHIPROCKET,
    });

    try {
      await syncUserProfileFromCheckoutAddress(auth.user, attempt.deliveryAddress);
    } catch (error) {
      console.error("Checkout profile sync failed", {
        userId: String(auth.user._id),
        orderId: String(result.order._id),
        code: error?.code,
      });
    }

    return success({
      order: result.order,
      shippingPending: Boolean(result.shippingError),
      idempotent: Boolean(result.idempotent),
    });
  } catch (error) {
    if (error instanceof RazorpayPaymentVerificationError) {
      return failure(error.code, error.message, error.status, error.details);
    }

    return handleRouteError(error, "RAZORPAY_VERIFY_FAILED");
  }
}
