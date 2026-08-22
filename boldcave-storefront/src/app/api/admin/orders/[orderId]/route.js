import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { isObjectId, ORDER_STATUSES } from "@/lib/validation";
import Order from "@/models/Order";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

async function findOrder(orderId) {
  const query = isObjectId(orderId) ? { _id: orderId } : { orderNumber: orderId };
  return Order.findOne(query);
}

export async function GET(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { orderId } = await params;
    await connectDB();
    const order = await findOrder(orderId);

    if (!order) return applyAdminCors(request, failure("ORDER_NOT_FOUND", "Order not found", 404));
    return applyAdminCors(request, success({ order }));
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error));
  }
}

export async function PATCH(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { orderId } = await params;
    const body = await readJson(request);
    const status = String(body.orderStatus || body.status || "").trim();

    if (!ORDER_STATUSES.includes(status)) {
      return applyAdminCors(request, failure("INVALID_STATUS", "Invalid order status", 400));
    }

    await connectDB();
    const order = await findOrder(orderId);
    if (!order) return applyAdminCors(request, failure("ORDER_NOT_FOUND", "Order not found", 404));

    order.orderStatus = status;
    await order.save();

    return applyAdminCors(request, success({ order }));
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error, "ORDER_UPDATE_FAILED"));
  }
}
