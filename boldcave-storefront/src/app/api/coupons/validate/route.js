import connectDB from "@/lib/db";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { calculateCart } from "@/lib/orders/pricing";

export const runtime = "nodejs";

export async function POST(request) {
  return withRuntimeDatabase(() => validateCouponRoute(request));
}

async function validateCouponRoute(request) {
  try {
    await connectDB();
    const body = await readJson(request);
    const auth = await requireUser(request);
    const userId = auth.response ? null : auth.user._id;
    const result = await calculateCart({
      items: body.items || [],
      couponCode: body.code || body.couponCode,
      paymentMethod: body.paymentMethod || "cod",
      userId,
    });

    if (result.error) {
      return failure(
        result.error.code,
        result.error.message,
        result.error.status,
        result.error.details
      );
    }

    const couponWasEntered = Boolean(body.code || body.couponCode);
    const couponApplied = Boolean(result.coupon?.code);
    const message =
      couponWasEntered && !couponApplied && result.discountWinner === "prepaid"
        ? "Online payment offer gives you a better saving."
        : couponApplied
          ? "Coupon applied successfully"
          : "No coupon applied";

    return success({
      valid: couponApplied,
      discount: result.discount,
      subtotal: result.subtotal,
      shipping: result.shipping,
      prepaidDiscount: result.prepaidDiscount,
      total: result.finalAmount,
      discountWinner: result.discountWinner,
      coupon: result.coupon?.code
        ? {
            code: result.coupon.code,
            discount: result.coupon.discount,
          }
        : { code: null, discount: 0 },
      message,
    });
  } catch (error) {
    return handleRouteError(error, "COUPON_VALIDATE_FAILED");
  }
}
