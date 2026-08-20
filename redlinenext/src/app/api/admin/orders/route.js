import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { handleRouteError, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import Order from "@/models/Order";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
    const skip = Math.max(Number(searchParams.get("skip")) || 0, 0);

    const filter = {};
    if (status) filter.orderStatus = status;
    if (paymentStatus) filter["payment.paymentStatus"] = paymentStatus;

    await connectDB();
    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(filter),
    ]);

    return applyAdminCors(request, success({ orders, total, limit, skip }));
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error));
  }
}
