import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { normalizeCouponCode, toPositiveNumber } from "@/lib/validation";
import Coupon from "@/models/Coupon";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

function buildCouponPayload(body) {
  const code = normalizeCouponCode(body.code);
  const discountType = body.discountType;
  const discountValue = toPositiveNumber(body.discountValue);
  const minimumOrder = toPositiveNumber(body.minimumOrder || body.minOrderAmount);
  const expiryDate = new Date(body.expiryDate);

  if (!code) return { error: "Coupon code is required" };
  if (!["percentage", "fixed"].includes(discountType)) return { error: "Invalid discount type" };
  if (discountValue <= 0) return { error: "Discount value must be greater than zero" };
  if (discountType === "percentage" && discountValue > 100) return { error: "Percentage discount cannot exceed 100" };
  if (Number.isNaN(expiryDate.getTime()) || expiryDate <= new Date()) return { error: "Expiry date must be in the future" };

  return {
    payload: {
      code,
      discountType,
      discountValue,
      minimumOrder,
      expiryDate,
      active: body.active !== undefined ? Boolean(body.active) : true,
    },
  };
}

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    await connectDB();
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    return applyAdminCors(request, success({ coupons }));
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error));
  }
}

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const body = await readJson(request);
    const result = buildCouponPayload(body);
    if (result.error) return applyAdminCors(request, failure("VALIDATION_ERROR", result.error, 400));

    await connectDB();
    const coupon = await Coupon.create(result.payload);
    return applyAdminCors(request, success({ coupon }, 201));
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error, "COUPON_CREATE_FAILED"));
  }
}

export { buildCouponPayload };
