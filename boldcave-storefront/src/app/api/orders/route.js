import { handleRouteError, success } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import connectDB from "@/lib/db";
import Order from "@/models/Order";

export const runtime = "nodejs";

const placedOrderFilter = {
  $or: [
    { "payment.method": "cod" },
    { "payment.method": "razorpay", "payment.paymentStatus": "paid" },
  ],
};

export async function GET(request) {
  return withRuntimeDatabase(() => getOrdersRoute(request));
}

async function getOrdersRoute(request) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;

    await connectDB();
    const orders = await Order.find({
      user: auth.user._id,
      ...placedOrderFilter,
    }).sort({ createdAt: -1 });
    return success({ orders });
  } catch (error) {
    return handleRouteError(error);
  }
}
