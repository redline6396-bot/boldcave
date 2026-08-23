import connectDB from "@/lib/db";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import {
  requireUser,
  verifyCheckoutPhoneToken,
} from "@/lib/auth/session";
import { calculateCart, generateOrderNumber, validateAddress } from "@/lib/orders/pricing";
import { createRazorpayOrder } from "@/lib/payments/razorpay";
import { isAcceptingOrders } from "@/lib/storeSettings";
import { isValidPhone, normalizePhone } from "@/lib/validation";
import RazorpayAttempt from "@/models/RazorpayAttempt";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;

    await connectDB();
    if (!(await isAcceptingOrders())) {
      return failure(
        "ORDERS_DISABLED",
        "We are currently not accepting orders. Please check back soon.",
        423
      );
    }

    const body = await readJson(request);
    const deliveryAddress = body.address || body.deliveryAddress;
    const checkoutPhone = normalizePhone(body.phone || auth.user.phone);
    const addressCheck = validateAddress(deliveryAddress);

    if (!addressCheck.valid) {
      return failure("INVALID_ADDRESS", addressCheck.message, 400);
    }

    if (!isValidPhone(checkoutPhone)) {
      return failure("INVALID_PHONE", "Enter a valid 10 digit Indian phone number", 400);
    }

    const accountPhone = normalizePhone(auth.user.phone);
    const isAccountPhone = checkoutPhone === accountPhone;

    if (isAccountPhone && !auth.user.phoneVerified) {
      return failure("PHONE_NOT_VERIFIED", "Verify your phone number to continue.", 403);
    }

    if (!isAccountPhone) {
      const verifiedPhone = verifyCheckoutPhoneToken(body.phoneVerificationToken);

      if (
        !verifiedPhone ||
        verifiedPhone.userId !== String(auth.user._id) ||
        verifiedPhone.phone !== checkoutPhone
      ) {
        return failure(
          "CHECKOUT_PHONE_NOT_VERIFIED",
          "Verify the checkout phone number to continue.",
          403
        );
      }
    }

    const cart = await calculateCart({
      items: body.items || [],
      couponCode: body.couponCode,
    });

    if (cart.error) {
      return failure(cart.error.code, cart.error.message, cart.error.status, cart.error.details);
    }

    const orderNumber = generateOrderNumber();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const razorpayOrder = await createRazorpayOrder({
      amount: cart.finalAmount,
      receipt: orderNumber,
      notes: {
        orderNumber,
        userId: String(auth.user._id),
      },
    });

    const attempt = await RazorpayAttempt.create({
      orderNumber,
      user: auth.user._id,
      customer: {
        firstName: auth.user.firstName || "",
        lastName: auth.user.lastName || "",
        phone: checkoutPhone,
        phoneVerified: true,
        email: auth.user.email || deliveryAddress?.email || "",
      },
      deliveryAddress,
      items: cart.items,
      amounts: {
        subtotal: cart.subtotal,
        discount: cart.discount,
        shipping: cart.shipping,
        finalAmount: cart.finalAmount,
      },
      coupon: cart.coupon,
      razorpayOrderId: razorpayOrder.id,
      status: "created",
      expiresAt,
    });

    return success({
      orderId: String(attempt._id),
      attemptId: String(attempt._id),
      orderNumber: attempt.orderNumber,
      razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },
      amount: cart.finalAmount,
    });
  } catch (error) {
    return handleRouteError(error, "RAZORPAY_CREATE_FAILED");
  }
}
