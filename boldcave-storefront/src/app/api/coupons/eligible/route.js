import connectDB from "@/lib/db";
import {
  handleRouteError,
  noStoreHeaders,
  success,
} from "@/lib/api/response";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { toPositiveNumber } from "@/lib/validation";
import Coupon from "@/models/Coupon";

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

function serializeEligibleCoupon(coupon, discount) {
  return {
    id: String(coupon._id),
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minimumOrder: coupon.minimumOrder,
    startsAt: coupon.startsAt,
    expiryDate: coupon.expiryDate,
    firstOrderOnly: Boolean(coupon.firstOrderOnly),
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

    const visibleCoupons = coupons
      .map((coupon) => {
        const discount = getDisplayDiscount(
          coupon,
          subtotal
        );

        return serializeEligibleCoupon(
          coupon,
          discount
        );
      })
      .filter((coupon) => coupon.discount > 0)
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
