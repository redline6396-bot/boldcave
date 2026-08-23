import connectDB from "@/lib/db";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { calculateCart } from "@/lib/orders/pricing";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await connectDB();
    const body = await readJson(request);
    const result = await calculateCart({
      items: body.items || [],
      couponCode: body.code || body.couponCode,
    });

    if (result.error) {
      return failure(
        result.error.code,
        result.error.message,
        result.error.status,
        result.error.details
      );
    }

    return success({
      valid: Boolean(result.coupon.code),
      discount: result.discount,
      subtotal: result.subtotal,
      shipping: result.shipping,
      total: result.finalAmount,
      coupon: result.coupon,
      message: result.coupon.code ? "Coupon applied successfully" : "No coupon applied",
    });
  } catch (error) {
    return handleRouteError(error, "COUPON_VALIDATE_FAILED");
  }
}
