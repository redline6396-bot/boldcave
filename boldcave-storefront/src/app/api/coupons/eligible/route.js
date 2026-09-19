import connectDB from "@/lib/db";
import {
  handleRouteError,
  noStoreHeaders,
  success,
} from "@/lib/api/response";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { requireUser } from "@/lib/auth/session";
import { hasPreviousOrder } from "@/lib/orders/pricing";
import { toPositiveNumber } from "@/lib/validation";
import Coupon from "@/models/Coupon";
import CouponUsage from "@/models/CouponUsage";

export const runtime = "nodejs";

function getDisplayDiscount(coupon, subtotal) {
  const amount = Number(subtotal) || 0;
  const value = Number(coupon.discountValue) || 0;

  if (Number(coupon.minimumOrder) > amount) {
    return 0;
  }

  if (coupon.discountType === "percentage") {
    return (amount * value) / 100;
  }

  return Math.min(value, amount);
}

function normalizeOptionalLimit(value) {
  if (value === undefined || value === null || value === "") return null;

  const limit = Number(value);
  return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : null;
}

function serializeEligibleCoupon(coupon, discount) {
  const usageLimit = normalizeOptionalLimit(coupon.usageLimit);
  const perCustomerLimit = normalizeOptionalLimit(coupon.perCustomerLimit);

  return {
    id: String(coupon._id),
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minimumOrder: coupon.minimumOrder,
    startsAt: coupon.startsAt,
    expiryDate: coupon.expiryDate,
    firstOrderOnly: Boolean(coupon.firstOrderOnly),
    usageLimit,
    perCustomerLimit,
    requiresLogin: Boolean(
      coupon.firstOrderOnly ||
        usageLimit !== null ||
        perCustomerLimit !== null
    ),
    selectedCustomersOnly: false,
    discount,
  };
}

export async function GET(request) {
  return withRuntimeDatabase(() => getEligibleCouponsRoute(request));
}

async function getEligibleCouponsRoute(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const subtotal = toPositiveNumber(
      searchParams.get("subtotal"),
      0
    );

    const now = new Date();
    const auth = await requireUser(request);
    const userId = auth.response ? null : auth.user._id;

    const coupons = await Coupon.find({
      active: true,
      visibility: "public",

      $and: [
        {
          $or: [
            { startsAt: null },
            { startsAt: { $lte: now } },
          ],
        },
        {
          $or: [
            { expiryDate: null },
            { expiryDate: { $gt: now } },
          ],
        },
        {
          $or: [
            { eligibleUserIds: { $exists: false } },
            { eligibleUserIds: { $size: 0 } },
          ],
        },
      ],
    })
      .sort({
        discountValue: -1,
        createdAt: -1,
      })
      .limit(50);

    const firstOrderEligible = userId
      ? !(await hasPreviousOrder(userId))
      : true;

    const usageCounts = new Map();

    if (userId && coupons.length) {
      const usageRows = await CouponUsage.aggregate([
        {
          $match: {
            userId,
            couponId: { $in: coupons.map((coupon) => coupon._id) },
          },
        },
        {
          $group: {
            _id: "$couponId",
            count: { $sum: 1 },
          },
        },
      ]);

      usageRows.forEach((row) => {
        usageCounts.set(String(row._id), Number(row.count) || 0);
      });
    }

    const visibleCoupons = coupons
      .map((coupon) => {
        const usageLimit = normalizeOptionalLimit(coupon.usageLimit);
        const perCustomerLimit = normalizeOptionalLimit(
          coupon.perCustomerLimit
        );

        if (
          usageLimit !== null &&
          Number(coupon.usedCount || 0) >= usageLimit
        ) {
          return null;
        }

        if (userId && coupon.firstOrderOnly && !firstOrderEligible) {
          return null;
        }

        if (
          userId &&
          perCustomerLimit !== null &&
          (usageCounts.get(String(coupon._id)) || 0) >= perCustomerLimit
        ) {
          return null;
        }

        const discount = getDisplayDiscount(
          coupon,
          subtotal
        );

        return serializeEligibleCoupon(
          coupon,
          discount
        );
      })
      .filter((coupon) => coupon?.discount > 0)
      .slice(0, 12);

    return success(
      { coupons: visibleCoupons },
      200,
      {
        headers: noStoreHeaders,
      }
    );
  } catch (error) {
    return handleRouteError(
      error,
      "ELIGIBLE_COUPONS_FAILED"
    );
  }
}
