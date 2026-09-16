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
    comingSoonMode: {
      type: Boolean,
      default: false,
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
    delhiveryPickup: {
      autoPickupEnabled: { type: Boolean, default: false },
      state: {
        type: String,
        enum: [
          "idle",
          "requesting",
          "scheduled",
          "cancelled",
          "failed",
          "needs_reconciliation",
        ],
        default: "idle",
      },
      requestDate: { type: String, trim: true },
      pickupId: { type: String, trim: true },
      requestedAt: { type: Date },
      expectedPackageCount: { type: Number, min: 0, default: 0 },
      lastError: { type: String, trim: true },
      requestStartedAt: { type: Date },
      cancelledAt: { type: Date },
    },
  },
  { timestamps: true }
);

if (
  mongoose.models.StoreSettings &&
  (!mongoose.models.StoreSettings.schema?.path("prepaidDiscount.enabled") ||
    !mongoose.models.StoreSettings.schema?.path("comingSoonMode") ||
    !mongoose.models.StoreSettings.schema?.path("delhiveryPickup.autoPickupEnabled") ||
    !mongoose.models.StoreSettings.schema?.path("delhiveryPickup.cancelledAt"))
) {
  delete mongoose.models.StoreSettings;
}

export const StoreSettingsSchema = storeSettingsSchema;

const StoreSettingsModel =
  mongoose.models.StoreSettings ||
  mongoose.model("StoreSettings", storeSettingsSchema);

export default createRuntimeModel("StoreSettings", StoreSettingsModel);
