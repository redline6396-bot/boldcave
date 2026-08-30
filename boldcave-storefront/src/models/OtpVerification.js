import mongoose from "mongoose";

import { createRuntimeModel } from "@/lib/runtimeModel";

const otpVerificationSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpVerificationSchema = otpVerificationSchema;

const OtpVerificationModel =
  mongoose.models.OtpVerification ||
  mongoose.model("OtpVerification", otpVerificationSchema);

export default createRuntimeModel("OtpVerification", OtpVerificationModel);
