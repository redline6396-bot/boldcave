import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { isObjectId } from "@/lib/validation";
import Coupon from "@/models/Coupon";
import { buildCouponPayload } from "../route";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function GET(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { couponId } = await params;
    if (!isObjectId(couponId)) return applyAdminCors(request, failure("INVALID_COUPON_ID", "Invalid coupon id", 400));

    await connectDB();
    const coupon = await Coupon.findById(couponId).populate(
      "eligibleUserIds",
      "firstName lastName phone email"
    );
    if (!coupon) return applyAdminCors(request, failure("COUPON_NOT_FOUND", "Coupon not found", 404));
    return applyAdminCors(request, success({ coupon }));
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error));
  }
}

export async function PATCH(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { couponId } = await params;
    if (!isObjectId(couponId)) return applyAdminCors(request, failure("INVALID_COUPON_ID", "Invalid coupon id", 400));

    await connectDB();

    const body = await readJson(request);
    const existing = await Coupon.findById(couponId);
    if (!existing) return applyAdminCors(request, failure("COUPON_NOT_FOUND", "Coupon not found", 404));
    const hasField = (field) => Object.prototype.hasOwnProperty.call(body, field);

    const merged = {
      code: body.code ?? existing.code,
      discountType: body.discountType ?? existing.discountType,
      discountValue: body.discountValue ?? existing.discountValue,
      minimumOrder: body.minimumOrder ?? body.minOrderAmount ?? existing.minimumOrder,
      expiryDate: body.expiryDate ?? existing.expiryDate,
      startsAt: hasField("startsAt") ? body.startsAt : existing.startsAt,
      usageLimit: hasField("usageLimit") ? body.usageLimit : existing.usageLimit,
      perCustomerLimit: hasField("perCustomerLimit")
        ? body.perCustomerLimit
        : existing.perCustomerLimit,
      firstOrderOnly: body.firstOrderOnly ?? existing.firstOrderOnly,
      visibility: body.visibility ?? existing.visibility,
      eligibleUserIds: hasField("eligibleUserIds")
        ? body.eligibleUserIds
        : existing.eligibleUserIds,
      active: body.active ?? existing.active,
    };

    const result = buildCouponPayload(merged);
    if (result.error) {
      return applyAdminCors(request, failure("VALIDATION_ERROR", result.error, 400));
    }

    const coupon = await Coupon.findByIdAndUpdate(couponId, result.payload, {
      returnDocument: "after",
      runValidators: true,
    }).populate("eligibleUserIds", "firstName lastName phone email");

    return applyAdminCors(request, success({ coupon }));
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error, "COUPON_UPDATE_FAILED"));
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { couponId } = await params;
    if (!isObjectId(couponId)) return applyAdminCors(request, failure("INVALID_COUPON_ID", "Invalid coupon id", 400));

    await connectDB();
    const coupon = await Coupon.findByIdAndDelete(couponId);
    if (!coupon) return applyAdminCors(request, failure("COUPON_NOT_FOUND", "Coupon not found", 404));

    return applyAdminCors(request, success({ deleted: true }));
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error, "COUPON_DELETE_FAILED"));
  }
}
