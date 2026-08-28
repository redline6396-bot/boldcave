import connectDB from "@/lib/db";
import { handleRouteError, noStoreHeaders, success } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/session";
import { calculateCouponDiscount } from "@/lib/orders/pricing";
import { toPositiveNumber } from "@/lib/validation";
import Coupon from "@/models/Coupon";

export const runtime = "nodejs";

function serializeEligibleCoupon(coupon, discount) {
  return {
    id: String(coupon._id),
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minimumOrder: coupon.minimumOrder,
    expiryDate: coupon.expiryDate,
    discount,
  };
}

export async function GET(request) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;

    await connectDB();
    const { searchParams } = new URL(request.url);
    const subtotal = toPositiveNumber(searchParams.get("subtotal"), 0);
    const now = new Date();

    const coupons = await Coupon.find({
      active: true,
      visibility: "public",
      $and: [
        {
          $or: [{ startsAt: null }, { startsAt: { $lte: now } }],
        },
        {
          $or: [{ expiryDate: null }, { expiryDate: { $gt: now } }],
        },
        {
          $or: [
            { eligibleUserIds: { $exists: false } },
            { eligibleUserIds: { $size: 0 } },
            { eligibleUserIds: auth.user._id },
          ],
        },
      ],
    })
      .sort({ discountValue: -1, createdAt: -1 })
      .limit(50);

    const eligibleCoupons = [];

    for (const coupon of coupons) {
      const result = await calculateCouponDiscount(coupon.code, subtotal, {
        userId: auth.user._id,
      });

      if (!result.error && result.discount > 0) {
        eligibleCoupons.push(serializeEligibleCoupon(coupon, result.discount));
      }
    }

    return success({ coupons: eligibleCoupons.slice(0, 12) }, 200, {
      headers: noStoreHeaders,
    });
  } catch (error) {
    return handleRouteError(error, "ELIGIBLE_COUPONS_FAILED");
  }
}
