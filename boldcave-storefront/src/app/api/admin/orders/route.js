import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { handleRouteError, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import Order from "@/models/Order";

export const runtime = "nodejs";

const ORDER_STATUSES = new Set([
  "shipping_pending",
  "confirmed",
  "processing",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "cancelled",
]);
const PAYMENT_STATUSES = new Set(["pending", "paid", "failed", "cod"]);
const PAYMENT_METHODS = new Set(["razorpay", "cod"]);
const SHIPPING_PROVIDERS = new Set(["shiprocket", "shadowfax", "delhivery"]);
const SORT_FIELDS = {
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  amount: "amounts.finalAmount",
  orderNumber: "orderNumber",
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function GET(request) {
  return withRuntimeDatabase(() => getAdminOrdersRoute(request));
}

async function getAdminOrdersRoute(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const paymentMethod = searchParams.get("paymentMethod");
    const shippingProvider = searchParams.get("shippingProvider");
    const search = String(searchParams.get("search") || "").trim().slice(0, 100);
    const dateFrom = parseDate(searchParams.get("dateFrom"));
    const dateTo = parseDate(searchParams.get("dateTo"));
    const sortBy = SORT_FIELDS[searchParams.get("sortBy")] || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
    const skip = Math.max(Number(searchParams.get("skip")) || 0, 0);

    const filter = {};
    if (ORDER_STATUSES.has(status)) filter.orderStatus = status;
    if (PAYMENT_STATUSES.has(paymentStatus)) {
      filter["payment.paymentStatus"] = paymentStatus;
    }
    if (PAYMENT_METHODS.has(paymentMethod)) {
      filter["payment.method"] = paymentMethod;
    }
    if (SHIPPING_PROVIDERS.has(shippingProvider)) {
      filter.shippingProvider = shippingProvider;
    }
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = dateFrom;
      if (dateTo) filter.createdAt.$lte = dateTo;
    }
    if (search) {
      const expression = { $regex: escapeRegex(search), $options: "i" };
      filter.$or = [
        { orderNumber: expression },
        { "customer.phone": expression },
        { "customer.email": expression },
        { "customer.firstName": expression },
        { "customer.lastName": expression },
        { "deliveryAddress.fullName": expression },
        { "deliveryAddress.pincode": expression },
        { "shiprocket.awbCode": expression },
        { "shadowfax.awbNumber": expression },
        { "delhivery.waybill": expression },
      ];
    }

    await connectDB();
    const [orders, total, summaryRows] = await Promise.all([
      Order.find(filter)
        .sort({ [sortBy]: sortOrder, _id: sortOrder })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter),
      Order.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            revenue: {
              $sum: {
                $cond: [
                  { $ne: ["$orderStatus", "cancelled"] },
                  { $ifNull: ["$amounts.finalAmount", 0] },
                  0,
                ],
              },
            },
            revenueOrderCount: {
              $sum: { $cond: [{ $ne: ["$orderStatus", "cancelled"] }, 1, 0] },
            },
            openOrders: {
              $sum: {
                $cond: [
                  { $not: [{ $in: ["$orderStatus", ["delivered", "cancelled"]] }] },
                  1,
                  0,
                ],
              },
            },
            cancelledOrders: {
              $sum: { $cond: [{ $eq: ["$orderStatus", "cancelled"] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const summaryRow = summaryRows[0] || {};
    const revenue = Number(summaryRow.revenue || 0);
    const revenueOrderCount = Number(summaryRow.revenueOrderCount || 0);

    return applyAdminCors(
      request,
      success({
        orders,
        total,
        limit,
        skip,
        summary: {
          revenue,
          averageOrderValue: revenueOrderCount ? revenue / revenueOrderCount : 0,
          openOrders: Number(summaryRow.openOrders || 0),
          cancelledOrders: Number(summaryRow.cancelledOrders || 0),
        },
      })
    );
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error));
  }
}
