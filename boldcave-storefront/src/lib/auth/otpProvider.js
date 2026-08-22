import crypto from "node:crypto";

import connectDB from "@/lib/db";
import OtpVerification from "@/models/OtpVerification";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function hashOtp(phone, otp) {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET || "development-otp-secret";
  return crypto
    .createHmac("sha256", secret)
    .update(`${phone}:${otp}`)
    .digest("hex");
}

function isMockOtpEnabled() {
  return (
    process.env.OTP_PROVIDER === "mock" &&
    process.env.OTP_MOCK_ENABLED === "true"
  );
}

export async function sendOtp(phone) {
  if (isMockOtpEnabled()) {
    const otp = String(crypto.randomInt(100000, 999999));
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await connectDB();
    await OtpVerification.deleteMany({ phone, consumedAt: null });
    await OtpVerification.create({
      phone,
      otpHash: hashOtp(phone, otp),
      expiresAt,
    });

    return {
      provider: "mock",
      expiresAt,
      devOtp: otp,
    };
  }

  if (!process.env.OTP_PROVIDER) {
    throw new Error("OTP provider is not configured");
  }

  throw new Error(`OTP provider "${process.env.OTP_PROVIDER}" is not implemented`);
}

export async function verifyOtp(phone, otp) {
  if (!isMockOtpEnabled()) {
    if (!process.env.OTP_PROVIDER) {
      throw new Error("OTP provider is not configured");
    }

    throw new Error(`OTP provider "${process.env.OTP_PROVIDER}" is not implemented`);
  }

  await connectDB();
  const record = await OtpVerification.findOne({
    phone,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!record) {
    return {
      verified: false,
      code: "OTP_EXPIRED",
      reason: "This verification code has expired. Please request a new one.",
    };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return {
      verified: false,
      code: "OTP_TOO_MANY_ATTEMPTS",
      reason: "Too many incorrect attempts. Please request a new code.",
    };
  }

  record.attempts += 1;
  const expectedHash = hashOtp(phone, otp);

  if (record.otpHash !== expectedHash) {
    await record.save();
    return {
      verified: false,
      code: "OTP_INCORRECT",
      reason: "Incorrect verification code.",
    };
  }

  record.consumedAt = new Date();
  await record.save();

  return { verified: true };
}
