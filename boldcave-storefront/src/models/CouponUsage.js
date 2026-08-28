import mongoose from "mongoose";

const couponUsageSchema = new mongoose.Schema(
  {
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    orderNumber: { type: String, required: true, trim: true },
    usedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

couponUsageSchema.index({ couponId: 1, orderId: 1 }, { unique: true });
couponUsageSchema.index({ couponId: 1, orderNumber: 1 }, { unique: true });
couponUsageSchema.index({ couponId: 1, userId: 1, usedAt: -1 });

const REQUIRED_COUPON_USAGE_PATHS = [
  "couponId",
  "userId",
  "orderId",
  "orderNumber",
  "usedAt",
];

if (
  mongoose.models.CouponUsage &&
  REQUIRED_COUPON_USAGE_PATHS.some(
    (path) => !mongoose.models.CouponUsage.schema?.path(path)
  )
) {
  delete mongoose.models.CouponUsage;
}

const CouponUsage =
  mongoose.models.CouponUsage ||
  mongoose.model("CouponUsage", couponUsageSchema);

export default CouponUsage;
