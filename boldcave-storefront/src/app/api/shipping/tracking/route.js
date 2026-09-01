import connectDB from "@/lib/db";
import { failure, handleRouteError, success } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { trackShipment } from "@/lib/shipping";
import { isObjectId } from "@/lib/validation";
import Order from "@/models/Order";

export const runtime = "nodejs";

export async function GET(request) {
  return withRuntimeDatabase(() => getShipmentTrackingRoute(request));
}

async function getShipmentTrackingRoute(request) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId") || "";
    const query = isObjectId(orderId)
      ? { _id: orderId, user: auth.user._id }
      : { orderNumber: orderId, user: auth.user._id };

    await connectDB();
    const order = await Order.findOne(query);

    if (!order) {
      return failure("ORDER_NOT_FOUND", "Order not found", 404);
    }

    return success(await trackShipment(order));
  } catch (error) {
    return handleRouteError(error, "TRACKING_FAILED");
  }
}
