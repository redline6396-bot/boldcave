import connectDB from "@/lib/db";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/session";
import { deductStock } from "@/lib/orders/pricing";
import { verifyRazorpaySignature } from "@/lib/payments/razorpay";
import { createShiprocketOrder } from "@/lib/shipping/shiprocket";
import { isAcceptingOrders } from "@/lib/storeSettings";
import Order from "@/models/Order";
import RazorpayAttempt from "@/models/RazorpayAttempt";

export const runtime = "nodejs";

export async function POST(request) {
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
      const existingOrder = await Order.findOne({
        _id: attempt.finalOrder,
        user: auth.user._id,
      });
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

    const existingOrder = await Order.findOne({
      orderNumber: attempt.orderNumber,
      user: auth.user._id,
    });
    if (existingOrder) {
      attempt.status = "paid";
      attempt.finalOrder = existingOrder._id;
      attempt.razorpayPaymentId = body.razorpay_payment_id;
      attempt.razorpaySignature = body.razorpay_signature;
      await attempt.save();
      return success({ order: existingOrder, idempotent: true });
    }

    if (!(await isAcceptingOrders())) {
      return failure(
        "ORDERS_DISABLED",
        "We are currently not accepting orders. Please check back soon.",
        423
      );
    }

    const claimedAttempt = await RazorpayAttempt.findOneAndUpdate(
      {
        _id: attempt._id,
        user: auth.user._id,
        status: { $in: ["created", "failed"] },
        finalOrder: null,
      },
      {
        $set: {
          status: "verifying",
          razorpayPaymentId: body.razorpay_payment_id,
          razorpaySignature: body.razorpay_signature,
          failureReason: "",
        },
      },
      { returnDocument: "after" }
    );

    if (!claimedAttempt) {
      const latestAttempt = await RazorpayAttempt.findById(attempt._id);
      if (latestAttempt?.finalOrder) {
        const finalizedOrder = await Order.findOne({
          _id: latestAttempt.finalOrder,
          user: auth.user._id,
        });
        if (finalizedOrder) {
          return success({ order: finalizedOrder, idempotent: true });
        }
      }

      return failure(
        "PAYMENT_VERIFICATION_IN_PROGRESS",
        "Payment verification is already in progress",
        409
      );
    }

    try {
      await deductStock(claimedAttempt.items);
    } catch (error) {
      if (error.code === "STOCK_CHANGED") {
        claimedAttempt.status = "failed";
        claimedAttempt.failureReason = "stock_changed_after_payment_verification";
        await claimedAttempt.save();
        return failure("STOCK_CHANGED", "Stock changed before payment confirmation", 409, {
          items: error.items,
        });
      }
      throw error;
    }

    const order = await Order.create({
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
        razorpayPaymentId: body.razorpay_payment_id,
        razorpaySignature: body.razorpay_signature,
      },
      orderStatus: "confirmed",
    });

    try {
      const shiprocketOrder = await createShiprocketOrder(order);
      order.shiprocket = {
        shiprocketOrderId: shiprocketOrder.order_id || shiprocketOrder.shiprocket_order_id,
        shipmentId: shiprocketOrder.shipment_id,
        awbCode: shiprocketOrder.awb_code,
        courierName: shiprocketOrder.courier_name,
        trackingUrl: shiprocketOrder.tracking_url,
        shipmentStatus: shiprocketOrder.status,
        syncStatus: "created",
      };
    } catch (error) {
      order.shiprocket = {
        syncStatus: error.message?.includes("not configured") ? "not_configured" : "failed",
        lastError: error.message,
      };
    }

    await order.save();

    claimedAttempt.status = "paid";
    claimedAttempt.finalOrder = order._id;
    claimedAttempt.razorpayPaymentId = body.razorpay_payment_id;
    claimedAttempt.razorpaySignature = body.razorpay_signature;
    claimedAttempt.failureReason = "";
    await claimedAttempt.save();

    return success({ order });
  } catch (error) {
    return handleRouteError(error, "RAZORPAY_VERIFY_FAILED");
  }
}
