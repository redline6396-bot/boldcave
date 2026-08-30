import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import {
  isObjectId,
  normalizeCouponCode,
  toPositiveInteger,
  toPositiveNumber,
} from "@/lib/validation";
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
  const startsAt =
    body.startsAt === undefined || body.startsAt === null || body.startsAt === ""
      ? null
      : new Date(body.startsAt);
  const usageLimit =
    body.usageLimit === undefined || body.usageLimit === null || body.usageLimit === ""
      ? null
      : toPositiveInteger(body.usageLimit, 0);
  const perCustomerLimit =
    body.perCustomerLimit === undefined ||
    body.perCustomerLimit === null ||
    body.perCustomerLimit === ""
      ? null
      : toPositiveInteger(body.perCustomerLimit, 0);
  const visibility = body.visibility === "public" ? "public" : "private";
  const eligibleUserIds = Array.isArray(body.eligibleUserIds)
    ? Array.from(
        new Set(
          body.eligibleUserIds
            .map((id) => String(id || "").trim())
            .filter((id) => isObjectId(id))
        )
      )
    : [];

  if (!code) return { error: "Coupon code is required" };
  if (!["percentage", "fixed"].includes(discountType)) return { error: "Invalid discount type" };
  if (discountValue <= 0) return { error: "Discount value must be greater than zero" };
  if (discountType === "percentage" && discountValue > 100) return { error: "Percentage discount cannot exceed 100" };
  if (Number.isNaN(expiryDate.getTime()) || expiryDate <= new Date()) return { error: "Expiry date must be in the future" };
  if (startsAt && Number.isNaN(startsAt.getTime())) return { error: "Start date is invalid" };
  if (usageLimit !== null && usageLimit <= 0) return { error: "Usage limit must be greater than zero" };
  if (perCustomerLimit !== null && perCustomerLimit <= 0) return { error: "Per customer limit must be greater than zero" };

  return {
    payload: {
      code,
      discountType,
      discountValue,
      minimumOrder,
      expiryDate,
      startsAt,
      usageLimit,
      perCustomerLimit,
      firstOrderOnly: Boolean(body.firstOrderOnly),
      visibility,
      eligibleUserIds,
      active: body.active !== undefined ? Boolean(body.active) : true,
    },
  };
}

export async function GET(request) {
  return withRuntimeDatabase(() => getAdminCouponsRoute(request));
}

async function getAdminCouponsRoute(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    await connectDB();
    const coupons = await Coupon.find()
      .populate("eligibleUserIds", "firstName lastName phone email")
      .sort({ createdAt: -1 });
    return applyAdminCors(request, success({ coupons }));
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error));
  }
}

export async function POST(request) {
  return withRuntimeDatabase(() => createAdminCouponRoute(request));
}

async function createAdminCouponRoute(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const body = await readJson(request);
    const result = buildCouponPayload(body);
    if (result.error) return applyAdminCors(request, failure("VALIDATION_ERROR", result.error, 400));

    await connectDB();
    const createdCoupon = await Coupon.create(result.payload);
    const coupon = await Coupon.findById(createdCoupon._id).populate(
      "eligibleUserIds",
      "firstName lastName phone email"
    );
    return applyAdminCors(request, success({ coupon }, 201));
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error, "COUPON_CREATE_FAILED"));
  }
}

export { buildCouponPayload };
