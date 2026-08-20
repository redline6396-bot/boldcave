import connectDB from "@/lib/db";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/session";
import { calculateCart, generateOrderNumber, validateAddress } from "@/lib/orders/pricing";
import { createRazorpayOrder } from "@/lib/payments/razorpay";
import RazorpayAttempt from "@/models/RazorpayAttempt";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;

    await connectDB();
    const body = await readJson(request);
    const addressCheck = validateAddress(body.address || body.deliveryAddress);

    if (!addressCheck.valid) {
      return failure("INVALID_ADDRESS", addressCheck.message, 400);
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
        phone: auth.user.phone,
        phoneVerified: auth.user.phoneVerified,
        email: auth.user.email || body.address?.email || "",
      },
      deliveryAddress: body.address || body.deliveryAddress,
      items: cart.items,
      amounts: {
        subtotal: cart.subtotal,
        discount: cart.discount,
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
