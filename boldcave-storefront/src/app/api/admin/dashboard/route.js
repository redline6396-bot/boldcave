import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { handleRouteError, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { getSerializedStoreSettings } from "@/lib/storeSettings";
import Order from "@/models/Order";
import Product from "@/models/Product";
import User from "@/models/User";

export const runtime = "nodejs";

const VALID_REVENUE_FILTER = {
  orderStatus: { $ne: "cancelled" },
  "payment.paymentStatus": { $in: ["paid", "cod"] },
};

const ORDER_STATUSES = [
  "confirmed",
  "processing",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

function getRangeDays(value) {
  return String(value || "7d") === "30d" ? 30 : 7;
}

function dateKey(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dateLabel(date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
  }).format(date);
}

function buildDateBuckets(days) {
  const today = new Date();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));
    return {
      date: dateKey(date),
      label: dateLabel(date),
      revenue: 0,
      orders: 0,
    };
  });
}

function customerName(order) {
  return (
    [order.customer?.firstName, order.customer?.lastName]
      .filter(Boolean)
      .join(" ") ||
    order.deliveryAddress?.fullName ||
    order.customer?.phone ||
    "Customer"
  );
}

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function GET(request) {
  return withRuntimeDatabase(() => getAdminDashboardRoute(request));
}

async function getAdminDashboardRoute(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { searchParams } = new URL(request.url);
    const days = getRangeDays(searchParams.get("range"));
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - (days - 1));
    periodStart.setHours(0, 0, 0, 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    await connectDB();

    const [
      totalOrders,
      revenueRows,
      periodRevenueRows,
      ordersToday,
      customers,
      newCustomers,
      products,
      publishedProducts,
      recentOrders,
      stockProducts,
      revenueSeriesRows,
      orderStatusRows,
      topProductRows,
      storeSettings,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([
        { $match: VALID_REVENUE_FILTER },
        { $group: { _id: null, revenue: { $sum: "$amounts.finalAmount" } } },
      ]),
      Order.aggregate([
        {
          $match: {
            ...VALID_REVENUE_FILTER,
            createdAt: { $gte: periodStart },
          },
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$amounts.finalAmount" },
            orders: { $sum: 1 },
          },
        },
      ]),
      Order.countDocuments({ createdAt: { $gte: todayStart } }),
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: periodStart } }),
      Product.countDocuments(),
      Product.countDocuments({ status: "published" }),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("orderNumber customer deliveryAddress payment amounts orderStatus createdAt")
        .lean(),
      Product.find({ "variants.stock": { $lte: 4 } })
        .select("name slug images variants status productType")
        .limit(40)
        .lean(),
      Order.aggregate([
        {
          $match: {
            ...VALID_REVENUE_FILTER,
            createdAt: { $gte: periodStart },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: "Asia/Kolkata",
              },
            },
            revenue: { $sum: "$amounts.finalAmount" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Order.aggregate([
        {
          $match: {
            ...VALID_REVENUE_FILTER,
            createdAt: { $gte: periodStart },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: {
              productId: "$items.productId",
              name: "$items.name",
              size: "$items.size",
              productType: "$items.productType",
            },
            units: { $sum: "$items.quantity" },
            revenue: {
              $sum: {
                $multiply: ["$items.unitPrice", "$items.quantity"],
              },
            },
            image: { $first: "$items.image" },
          },
        },
        { $sort: { revenue: -1, units: -1 } },
        { $limit: 5 },
      ]),
      getSerializedStoreSettings(),
    ]);

    const seriesByDate = new Map(
      revenueSeriesRows.map((row) => [
        row._id,
        {
          revenue: row.revenue || 0,
          orders: row.orders || 0,
        },
      ])
    );
    const revenueSeries = buildDateBuckets(days).map((bucket) => ({
      ...bucket,
      ...(seriesByDate.get(bucket.date) || {}),
    }));

    const statusCounts = ORDER_STATUSES.map((status) => {
      const found = orderStatusRows.find((row) => row._id === status);
      return { status, count: found?.count || 0 };
    });

    const stockAttention = stockProducts
      .flatMap((product) =>
        (product.variants || [])
          .filter((variant) => Number(variant.stock) <= 4)
          .map((variant) => ({
            productId: String(product._id),
            name: product.name,
            slug: product.slug,
            status: product.status,
            productType: product.productType,
            size: variant.size,
            sku: variant.sku || "",
            stock: Number(variant.stock) || 0,
            image:
              variant.images?.[0]?.url ||
              variant.image?.url ||
              product.images?.[0]?.url ||
              "",
            level: Number(variant.stock) <= 0 ? "out" : "low",
          }))
      )
      .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name))
      .slice(0, 8);

    return applyAdminCors(
      request,
      success({
        totalOrders,
        revenue: revenueRows[0]?.revenue || 0,
        period: {
          days,
          revenue: periodRevenueRows[0]?.revenue || 0,
          orders: periodRevenueRows[0]?.orders || 0,
        },
        ordersToday,
        customers,
        newCustomers,
        products,
        publishedProducts,
        recentOrders: recentOrders.map((order) => ({
          ...order,
          customerName: customerName(order),
        })),
        stockAttention,
        orderStatusCounts: statusCounts,
        revenueSeries,
        topProducts: topProductRows.map((row) => ({
          productId: String(row._id.productId || ""),
          name: row._id.name || "Product",
          size: row._id.productType === "combo" ? "Combo" : row._id.size,
          productType: row._id.productType || "product",
          units: row.units || 0,
          revenue: row.revenue || 0,
          image: row.image || "",
        })),
        storeSettings,
      })
    );
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error));
  }
}
