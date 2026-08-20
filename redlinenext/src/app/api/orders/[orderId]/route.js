import connectDB from "@/lib/db";
import { failure, handleRouteError, success } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/session";
import { isObjectId } from "@/lib/validation";
import Order from "@/models/Order";

export const runtime = "nodejs";

const placedOrderFilter = {
  $or: [
    { "payment.method": "cod" },
    { "payment.method": "razorpay", "payment.paymentStatus": "paid" },
  ],
};

export async function GET(request, { params }) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;

    const { orderId } = await params;
    const query = isObjectId(orderId)
      ? { _id: orderId, user: auth.user._id, ...placedOrderFilter }
      : {
          orderNumber: String(orderId || ""),
          user: auth.user._id,
          ...placedOrderFilter,
        };

    await connectDB();
    const order = await Order.findOne(query);
    if (!order) {
      return failure("ORDER_NOT_FOUND", "Order not found", 404);
    }

    return success({ order });
  } catch (error) {
    return handleRouteError(error);
  }
}
