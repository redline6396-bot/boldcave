import mongoose from "mongoose";

const otpVerificationSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: true },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OtpVerification =
  mongoose.models.OtpVerification ||
  mongoose.model("OtpVerification", otpVerificationSchema);

export default OtpVerification;
