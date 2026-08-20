import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { handleRouteError, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import Order from "@/models/Order";
import Product from "@/models/Product";
import User from "@/models/User";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    await connectDB();

    const [
      totalOrders,
      revenueRows,
      customers,
      products,
      recentOrders,
      lowStockProducts,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([
        {
          $match: {
            orderStatus: { $ne: "cancelled" },
            "payment.paymentStatus": { $in: ["paid", "cod"] },
          },
        },
        { $group: { _id: null, revenue: { $sum: "$amounts.finalAmount" } } },
      ]),
      User.countDocuments(),
      Product.countDocuments(),
      Order.find().sort({ createdAt: -1 }).limit(10),
      Product.find({ "variants.stock": { $lt: 5 } })
        .select("name slug variants status")
        .limit(20),
    ]);

    return applyAdminCors(
      request,
      success({
        totalOrders,
        revenue: revenueRows[0]?.revenue || 0,
        customers,
        products,
        recentOrders,
        lowStockProducts,
      })
    );
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error));
  }
}
