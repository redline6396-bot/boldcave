import mongoose from "mongoose";

import { createRuntimeModel } from "@/lib/runtimeModel";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[A-Z0-9_-]+$/,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountValue: { type: Number, required: true, min: 0 },
    minimumOrder: { type: Number, default: 0, min: 0 },
    startsAt: { type: Date, default: null },
    expiryDate: { type: Date, required: true },
    active: { type: Boolean, default: true, index: true },
    usageLimit: { type: Number, default: null, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    perCustomerLimit: { type: Number, default: null, min: 0 },
    firstOrderOnly: { type: Boolean, default: false },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "private",
      index: true,
    },
    eligibleUserIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
  },
  { timestamps: true }
);

couponSchema.index({ active: 1, expiryDate: 1 });
couponSchema.index({ visibility: 1, active: 1, startsAt: 1, expiryDate: 1 });

const REQUIRED_COUPON_PATHS = [
  "startsAt",
  "usageLimit",
  "usedCount",
  "perCustomerLimit",
  "firstOrderOnly",
  "visibility",
  "eligibleUserIds",
];

if (
  mongoose.models.Coupon &&
  REQUIRED_COUPON_PATHS.some((path) => !mongoose.models.Coupon.schema?.path(path))
) {
  delete mongoose.models.Coupon;
}

export const CouponSchema = couponSchema;

const CouponModel = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);

export default createRuntimeModel("Coupon", CouponModel);
