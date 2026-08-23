import connectDB from "@/lib/db";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import {
  requireUser,
  verifyCheckoutPhoneToken,
} from "@/lib/auth/session";
import {
  calculateCart,
  deductStock,
  generateOrderNumber,
  validateAddress,
} from "@/lib/orders/pricing";
import { createShiprocketOrder } from "@/lib/shipping/shiprocket";
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

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
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
      payment: {
        method: "cod",
        paymentStatus: "cod",
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
      await order.save();
    } catch (error) {
      order.shiprocket = {
        syncStatus: error.message?.includes("not configured") ? "not_configured" : "failed",
        lastError: error.message,
      };
      await order.save();
    }

    return success({ order }, 201);
  } catch (error) {
    return handleRouteError(error, "COD_CHECKOUT_FAILED");
  }
}
