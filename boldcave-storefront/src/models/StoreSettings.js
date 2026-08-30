import mongoose from "mongoose";

import { createRuntimeModel } from "@/lib/runtimeModel";

const storeSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "global",
      immutable: true,
    },
    acceptingOrders: {
      type: Boolean,
      default: true,
    },
    otpMode: {
      type: String,
      enum: ["test", "live"],
      default: "live",
    },
    prepaidDiscount: {
      enabled: { type: Boolean, default: true },
      discountType: {
        type: String,
        enum: ["percentage", "fixed"],
        default: "percentage",
      },
      discountValue: { type: Number, default: 10, min: 0 },
      allowCouponStacking: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

if (
  mongoose.models.StoreSettings &&
  !mongoose.models.StoreSettings.schema?.path("prepaidDiscount.enabled")
) {
  delete mongoose.models.StoreSettings;
}

export const StoreSettingsSchema = storeSettingsSchema;

const StoreSettingsModel =
  mongoose.models.StoreSettings ||
  mongoose.model("StoreSettings", storeSettingsSchema);

export default createRuntimeModel("StoreSettings", StoreSettingsModel);
