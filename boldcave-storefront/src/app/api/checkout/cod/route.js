import connectDB from "@/lib/db";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/session";
import {
  calculateCart,
  deductStock,
  generateOrderNumber,
  validateAddress,
} from "@/lib/orders/pricing";
import { createShiprocketOrder } from "@/lib/shipping/shiprocket";
import { isAcceptingOrders } from "@/lib/storeSettings";
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
