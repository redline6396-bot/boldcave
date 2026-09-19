import connectDB from "@/lib/db";
import { handleRouteError, noStoreHeaders, success } from "@/lib/api/response";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import Coupon from "@/models/Coupon";

export const runtime = "nodejs";

function normalizeOptionalLimit(value) {
  if (value === undefined || value === null || value === "") return null;
  const limit = Number(value);
  return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : null;
}

function serializePublicCoupon(coupon) {
  return {
    id: String(coupon._id),
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minimumOrder: coupon.minimumOrder,
    startsAt: coupon.startsAt,
    expiryDate: coupon.expiryDate,
    firstOrderOnly: Boolean(coupon.firstOrderOnly),
  };
}

export async function GET(request) {
  return withRuntimeDatabase(() => getPublicPromotionsRoute(request));
}

async function getPublicPromotionsRoute(request) {
  try {
    await connectDB();

    const now = new Date();

    const activePublicCoupons = await Coupon.find({
      active: true,
      visibility: "public",
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ expiryDate: null }, { expiryDate: { $gt: now } }] },
        { $or: [{ eligibleUserIds: { $exists: false } }, { eligibleUserIds: { $size: 0 } }] },
      ],
    }).sort({
      discountValue: -1,
      createdAt: -1,
    });

    const validCoupons = activePublicCoupons.filter((coupon) => {
      const usageLimit = normalizeOptionalLimit(coupon.usageLimit);
      if (usageLimit !== null && Number(coupon.usedCount || 0) >= usageLimit) {
        return false;
      }
      return true;
    });

    const firstOrderCoupon = validCoupons.find((c) => c.firstOrderOnly) || null;
    const generalCoupon = validCoupons.find((c) => !c.firstOrderOnly) || null;

    return success(
      {
        firstOrderCoupon: firstOrderCoupon ? serializePublicCoupon(firstOrderCoupon) : null,
        generalCoupon: generalCoupon ? serializePublicCoupon(generalCoupon) : null,
      },
      200,
      { headers: noStoreHeaders }
    );
  } catch (error) {
    return handleRouteError(error, "PUBLIC_PROMOTIONS_FAILED");
  }
}
