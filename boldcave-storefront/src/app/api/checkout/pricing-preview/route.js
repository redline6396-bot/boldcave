import connectDB from "@/lib/db";
import {
  failure,
  handleRouteError,
  noStoreHeaders,
  readJson,
  success,
} from "@/lib/api/response";
import { requireUser } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { calculateCart } from "@/lib/orders/pricing";

export const runtime = "nodejs";

function serializePricing(result) {
  return {
    subtotal: result.subtotal,
    couponDiscount: result.discount,
    prepaidDiscount: result.prepaidDiscount,
    shipping: result.shipping,
    finalAmount: result.finalAmount,
    discountWinner: result.discountWinner,
    coupon: result.coupon,
  };
}

export async function POST(request) {
  return withRuntimeDatabase(() => previewCheckoutPricingRoute(request));
}

async function previewCheckoutPricingRoute(request) {
  try {
    await connectDB();

    const body = await readJson(request);
    const auth = await requireUser(request);
    const userId = auth.response ? null : auth.user._id;
    const items = Array.isArray(body.items) ? body.items : [];
    const couponCode = body.couponCode || body.code || "";

    const [codResult, onlineResult] = await Promise.all([
      calculateCart({
        items,
        couponCode,
        paymentMethod: "cod",
        userId,
      }),
      calculateCart({
        items,
        couponCode,
        paymentMethod: "razorpay",
        userId,
      }),
    ]);

    const error = codResult.error || onlineResult.error;
    if (error) {
      return failure(error.code, error.message, error.status, error.details);
    }

    return success(
      {
        base: serializePricing(codResult),
        cod: serializePricing(codResult),
        online: serializePricing(onlineResult),
        prepaidDiscountSettings: onlineResult.prepaidDiscountSettings,
      },
      200,
      { headers: noStoreHeaders }
    );
  } catch (error) {
    return handleRouteError(error, "CHECKOUT_PRICING_PREVIEW_FAILED");
  }
}
