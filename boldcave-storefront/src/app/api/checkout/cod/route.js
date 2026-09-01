import connectDB from "@/lib/db";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import {
  requireUser,
  verifyCheckoutPhoneToken,
} from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import {
  checkoutProfileFromAddress,
  syncUserProfileFromCheckoutAddress,
} from "@/lib/auth/users";
import {
  calculateCart,
  consumeCouponUsageForOrder,
  deductStock,
  generateOrderNumber,
  releaseCouponUsageForOrder,
  restoreStock,
  validateAddress,
} from "@/lib/orders/pricing";
import {
  getConfiguredShippingProvider,
  syncShipment,
  validateCheckoutServiceability,
} from "@/lib/shipping";
import { isAcceptingOrders } from "@/lib/storeSettings";
import { isValidPhone, normalizePhone } from "@/lib/validation";
import Order from "@/models/Order";

export const runtime = "nodejs";

const SHIPPING_TEMPORARILY_UNAVAILABLE_MESSAGE =
  "We're unable to process your order right now. Please try again shortly.";
const ORDER_SHIPMENT_PENDING_MESSAGE =
  "We're verifying your order. Please don't place it again right now.";

function hasProviderShipmentIdentity(order) {
  const shadowfax = order?.shadowfax || {};
  const shiprocket = order?.shiprocket || {};

  return Boolean(
    shadowfax.orderId ||
      shadowfax.awbNumber ||
      shiprocket.shiprocketOrderId ||
      shiprocket.shipmentId ||
      shiprocket.awbCode
  );
}

function getShippingSyncStatus(order, shipmentSync) {
  return (
    shipmentSync?.syncStatus ||
    order?.shadowfax?.syncStatus ||
    order?.shiprocket?.syncStatus ||
    ""
  );
}

async function markCodOrderConfirmed(order) {
  const confirmedOrder = await Order.findByIdAndUpdate(
    order._id,
    {
      $set: {
        orderStatus: "confirmed",
      },
    },
    { returnDocument: "after" }
  );

  return confirmedOrder || order;
}

async function voidCodOrderAfterShippingFailure(order, { userId }) {
  await restoreStock(order.items);

  try {
    await releaseCouponUsageForOrder({ coupon: order.coupon, order });
  } catch (error) {
    console.error("COD coupon usage release failed after shipping failure", {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      code: error?.code,
    });
  }

  const now = new Date();
  const voidedOrder = await Order.findByIdAndUpdate(
    order._id,
    {
      $set: {
        orderStatus: "cancelled",
        "cancellation.status": "cancelled",
        "cancellation.reason": "Shipping creation failed",
        "cancellation.cancelledBy": "system",
        "cancellation.cancelledAt": now,
        "stockRestoration.status": "restored",
        "stockRestoration.restoredAt": now,
        "stockRestoration.error": "",
      },
    },
    { returnDocument: "after" }
  );

  console.error("COD shipping failed; provisional order voided", {
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    userId: String(userId),
    shippingProvider: order.shippingProvider,
    shadowfaxSyncStatus: voidedOrder?.shadowfax?.syncStatus,
    shiprocketSyncStatus: voidedOrder?.shiprocket?.syncStatus,
    shadowfaxLastError: voidedOrder?.shadowfax?.lastError,
    shiprocketLastError: voidedOrder?.shiprocket?.lastError,
  });

  return voidedOrder || order;
}

async function markCodOrderShipmentPending(order) {
  const pendingOrder = await Order.findByIdAndUpdate(
    order._id,
    {
      $set: {
        orderStatus: "shipping_pending",
      },
    },
    { returnDocument: "after" }
  );

  return pendingOrder || order;
}

export async function POST(request) {
  return withRuntimeDatabase(() => createCodOrderRoute(request));
}

async function createCodOrderRoute(request) {
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
      paymentMethod: "cod",
      userId: auth.user._id,
    });

    if (cart.error) {
      return failure(cart.error.code, cart.error.message, cart.error.status, cart.error.details);
    }

    const shippingProvider = getConfiguredShippingProvider();
    const serviceability = await validateCheckoutServiceability({
      deliveryPincode: deliveryAddress.pincode,
      cod: true,
      items: cart.items,
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
        prepaidDiscount: cart.prepaidDiscount,
        shipping: cart.shipping,
        finalAmount: cart.finalAmount,
      },
      coupon: cart.coupon,
      payment: {
        method: "cod",
        paymentStatus: "cod",
      },
      orderStatus: "shipping_pending",
      shippingProvider,
    });

    await consumeCouponUsageForOrder({
      coupon: cart.coupon,
      userId: auth.user._id,
      order,
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

    const shipmentSync = await syncShipment(order);
    const syncedOrder = shipmentSync.order || order;
    const shippingSyncStatus = getShippingSyncStatus(syncedOrder, shipmentSync);

    if (
      shipmentSync.ok &&
      shippingSyncStatus === "created" &&
      hasProviderShipmentIdentity(syncedOrder)
    ) {
      return success({ order: await markCodOrderConfirmed(syncedOrder) }, 201);
    }

    if (shippingSyncStatus === "failed" || shippingSyncStatus === "not_configured") {
      await voidCodOrderAfterShippingFailure(syncedOrder, {
        userId: auth.user._id,
      });

      return failure(
        "SHIPPING_TEMPORARILY_UNAVAILABLE",
        SHIPPING_TEMPORARILY_UNAVAILABLE_MESSAGE,
        503
      );
    }

    if (
      shippingSyncStatus === "needs_reconciliation" ||
      shipmentSync.needsReconciliation ||
      shipmentSync.inProgress
    ) {
      await markCodOrderShipmentPending(syncedOrder);

      return failure(
        "ORDER_SHIPMENT_PENDING",
        ORDER_SHIPMENT_PENDING_MESSAGE,
        409
      );
    }

    await markCodOrderShipmentPending(syncedOrder);

    return failure(
      "ORDER_SHIPMENT_PENDING",
      ORDER_SHIPMENT_PENDING_MESSAGE,
      409
    );
  } catch (error) {
    return handleRouteError(error, "COD_CHECKOUT_FAILED");
  }
}
