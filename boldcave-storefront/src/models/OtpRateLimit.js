import mongoose from "mongoose";

const otpRateLimitSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    phone: { type: String, required: true, index: true },
    sendCount: { type: Number, default: 0 },
    windowStartedAt: { type: Date, required: true },
    lastSentAt: { type: Date, default: null },
    blockedUntil: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

otpRateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OtpRateLimit =
  mongoose.models.OtpRateLimit ||
  mongoose.model("OtpRateLimit", otpRateLimitSchema);

export default OtpRateLimit;
