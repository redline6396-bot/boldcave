import connectDB from "@/lib/db";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import {
  requireUser,
  verifyCheckoutPhoneToken,
} from "@/lib/auth/session";
import {
  checkoutProfileFromAddress,
  syncUserProfileFromCheckoutAddress,
} from "@/lib/auth/users";
import {
  calculateCart,
  deductStock,
  generateOrderNumber,
  validateAddress,
} from "@/lib/orders/pricing";
import {
  syncShiprocketOrder,
  validateCheckoutServiceability,
} from "@/lib/shipping/shiprocket";
import { isAcceptingOrders } from "@/lib/storeSettings";
import { isValidPhone, normalizePhone } from "@/lib/validation";
import Order from "@/models/Order";

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

    const serviceability = await validateCheckoutServiceability({
      deliveryPincode: deliveryAddress.pincode,
      cod: true,
    });

    if (!serviceability.ok) {
      return failure(
        serviceability.code,
        serviceability.message,
        serviceability.status,
        { retryable: serviceability.retryable }
      );
    }

    try {
      await deductStock(cart.items);
    } catch (error) {
      if (error.code === "STOCK_CHANGED") {
        return failure("STOCK_CHANGED", "Stock changed during checkout", 409, {
          items: error.items,
        });
      }
      throw error;
    }

    const checkoutProfile = checkoutProfileFromAddress(deliveryAddress);
    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      user: auth.user._id,
      customer: {
        firstName: checkoutProfile.firstName || auth.user.firstName || "",
        lastName: checkoutProfile.lastName || auth.user.lastName || "",
        phone: checkoutPhone,
        phoneVerified: true,
        email: checkoutProfile.email || auth.user.email || "",
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
      payment: {
        method: "cod",
        paymentStatus: "cod",
      },
      orderStatus: "confirmed",
    });

    try {
      await syncUserProfileFromCheckoutAddress(auth.user, deliveryAddress);
    } catch (error) {
      console.error("Checkout profile sync failed", {
        userId: String(auth.user._id),
        orderId: String(order._id),
        code: error?.code,
      });
    }

    const shiprocketSync = await syncShiprocketOrder(order);

    return success({ order: shiprocketSync.order || order }, 201);
  } catch (error) {
    return handleRouteError(error, "COD_CHECKOUT_FAILED");
  }
}
