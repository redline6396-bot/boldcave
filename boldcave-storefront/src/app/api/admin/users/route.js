import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { handleRouteError, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import Order from "@/models/Order";
import User from "@/models/User";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function GET(request) {
  return withRuntimeDatabase(() => getAdminUsersRoute(request));
}

async function getAdminUsersRoute(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { searchParams } = new URL(request.url);
    const search = String(searchParams.get("search") || "").trim();
    const status = searchParams.get("status");
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
    const skip = Math.max(Number(searchParams.get("skip")) || 0, 0);

    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
      ];
    }

    await connectDB();
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    const orderCounts = await Order.aggregate([
      { $match: { user: { $in: users.map((user) => user._id) } } },
      { $group: { _id: "$user", totalOrders: { $sum: 1 } } },
    ]);
    const countMap = new Map(
      orderCounts.map((entry) => [String(entry._id), entry.totalOrders])
    );

    return applyAdminCors(
      request,
      success({
        users: users.map((user) => ({
          ...user.toObject(),
          totalOrders: countMap.get(String(user._id)) || 0,
        })),
        total,
        limit,
        skip,
      })
    );
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error));
  }
}
