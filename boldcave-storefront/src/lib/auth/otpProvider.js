import crypto from "node:crypto";

import connectDB from "@/lib/db";
import { getOtpMode } from "@/lib/storeSettings";
import { normalizePhone } from "@/lib/validation";
import OtpRateLimit from "@/models/OtpRateLimit";
import OtpVerification from "@/models/OtpVerification";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const STARTMESSAGING_BASE_URL = "https://api.startmessaging.com";
const STARTMESSAGING_TEMPLATE_ID = "6990f1b1-6a28-4cb4-a8ed-35a450a6b59d";
const SEND_COOLDOWN_SECONDS = 30;
const SEND_WINDOW_MINUTES = 60;
const MAX_SENDS_PER_WINDOW = 8;
const SEND_BLOCK_MINUTES = 15;
const PROVIDER_TIMEOUT_MS = 10000;
export const OTP_PUBLIC_DELIVERY_ERROR_MESSAGE =
  "We couldn't send the OTP right now. Please try again shortly.";

export class OtpRateLimitError extends Error {
  constructor(message, retryAfterSeconds) {
    super(message);
    this.name = "OtpRateLimitError";
    this.code = "OTP_RATE_LIMITED";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class OtpDeliveryError extends Error {
  constructor(message = OTP_PUBLIC_DELIVERY_ERROR_MESSAGE) {
    super(message);
    this.name = "OtpDeliveryError";
    this.code = "OTP_DELIVERY_FAILED";
  }
}

export class OtpTestPhoneNotAllowedError extends Error {
  constructor() {
    super("This phone number is not enabled for OTP test mode.");
    this.name = "OtpTestPhoneNotAllowedError";
    this.code = "OTP_TEST_PHONE_NOT_ALLOWED";
  }
}

function hashOtp(phone, otp) {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is not configured");
  }

  return crypto
    .createHmac("sha256", secret || "development-otp-secret")
    .update(`${phone}:${otp}`)
    .digest("hex");
}

function isMockOtpEnabledForMode(mode) {
  return mode === "test" && process.env.OTP_MOCK_ENABLED === "true";
}

function getTestPhoneWhitelist() {
  return new Set(
    String(process.env.OTP_TEST_PHONES || "")
      .split(",")
      .map((phone) => normalizePhone(phone))
      .filter(Boolean)
  );
}

function assertTestMockAllowed(phone) {
  if (process.env.OTP_MOCK_ENABLED !== "true") {
    throw new Error("OTP mock mode is not configured");
  }

  if (!getTestPhoneWhitelist().has(normalizePhone(phone))) {
    throw new OtpTestPhoneNotAllowedError();
  }
}

function retryAfterSeconds(until) {
  return Math.max(1, Math.ceil((until.getTime() - Date.now()) / 1000));
}

function maskPhone(phone) {
  return `${String(phone).slice(0, 2)}******${String(phone).slice(-2)}`;
}

async function reserveOtpSend(phone) {
  const now = new Date();
  const key = `phone:${phone}`;
  const windowMs = SEND_WINDOW_MINUTES * 60 * 1000;
  const expiresAt = new Date(now.getTime() + windowMs + SEND_BLOCK_MINUTES * 60 * 1000);

  let record = await OtpRateLimit.findOne({ key });

  if (!record) {
    record = new OtpRateLimit({
      key,
      phone,
      sendCount: 0,
      windowStartedAt: now,
      expiresAt,
    });
  }

  if (record.blockedUntil && record.blockedUntil > now) {
    throw new OtpRateLimitError(
      "Too many OTP requests. Please try again later.",
      retryAfterSeconds(record.blockedUntil)
    );
  }

  if (record.lastSentAt) {
    const cooldownUntil = new Date(
      record.lastSentAt.getTime() + SEND_COOLDOWN_SECONDS * 1000
    );

    if (cooldownUntil > now) {
      throw new OtpRateLimitError(
        "Please wait before requesting another OTP.",
        retryAfterSeconds(cooldownUntil)
      );
    }
  }

  if (now.getTime() - record.windowStartedAt.getTime() >= windowMs) {
    record.sendCount = 0;
    record.windowStartedAt = now;
    record.blockedUntil = null;
  }

  if (record.sendCount >= MAX_SENDS_PER_WINDOW) {
    record.blockedUntil = new Date(now.getTime() + SEND_BLOCK_MINUTES * 60 * 1000);
    record.expiresAt = new Date(record.blockedUntil.getTime() + windowMs);
    await record.save();

    throw new OtpRateLimitError(
      "Too many OTP requests. Please try again later.",
      retryAfterSeconds(record.blockedUntil)
    );
  }

  record.sendCount += 1;
  record.lastSentAt = now;
  record.expiresAt = expiresAt;
  await record.save();
}

async function sendStartMessagingOtp(phone, otp) {
  const apiKey = process.env.OTP_API_KEY;

  if (!apiKey) {
    throw new Error("OTP_API_KEY is not configured");
  }

  const controller = new globalThis.AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetch(`${STARTMESSAGING_BASE_URL}/otp/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        phoneNumber: `+91${phone}`,
        templateId: STARTMESSAGING_TEMPLATE_ID,
        variables: {
          otp,
          appName: "Bold Cave",
          expiry: String(OTP_TTL_MINUTES),
        },
      }),
      signal: controller.signal,
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error("StartMessaging OTP send failed", {
        status: response.status,
        phone: maskPhone(phone),
      });
      throw new OtpDeliveryError(providerFailureMessage(response.status));
    }

    if (responseText.trim()) {
      try {
        JSON.parse(responseText);
      } catch {
        console.error("StartMessaging OTP send returned malformed JSON", {
          phone: maskPhone(phone),
        });
        throw new OtpDeliveryError();
      }
    }
  } catch (error) {
    if (error instanceof OtpDeliveryError) {
      throw error;
    }

    console.error("StartMessaging OTP send error", {
      name: error?.name,
      phone: maskPhone(phone),
    });
    throw new OtpDeliveryError();
  } finally {
    clearTimeout(timeout);
  }
}

function providerFailureMessage(status) {
  if (status === 429) {
    return "OTP service is busy. Please try again shortly.";
  }

  return OTP_PUBLIC_DELIVERY_ERROR_MESSAGE;
}

export async function sendOtp(phone) {
  await connectDB();

  const mode = await getOtpMode();

  if (mode === "test") {
    assertTestMockAllowed(phone);
    await reserveOtpSend(phone);

    const { otp, expiresAt } = await createStoredOtp(phone);
    return {
      provider: "mock",
      expiresAt,
      demoOtp: otp,
    };
  }

  if (process.env.OTP_PROVIDER !== "startmessaging") {
    if (!process.env.OTP_PROVIDER) {
      throw new Error("OTP provider is not configured");
    }

    throw new Error(`OTP provider "${process.env.OTP_PROVIDER}" is not configured for LIVE mode`);
  }

  await reserveOtpSend(phone);
  const { otp, expiresAt, recordId } = await createStoredOtp(phone);

  try {
    await sendStartMessagingOtp(phone, otp);
  } catch (error) {
    await OtpVerification.deleteOne({ _id: recordId });
    throw error;
  }

  return {
    provider: "startmessaging",
    expiresAt,
  };
}

async function createStoredOtp(phone) {
  const otp = String(crypto.randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await OtpVerification.deleteMany({ phone, consumedAt: null });
  const record = await OtpVerification.create({
    phone,
    otpHash: hashOtp(phone, otp),
    expiresAt,
  });

  return {
    otp,
    expiresAt,
    recordId: record._id,
  };
}

async function canVerifyOtp(phone) {
  const mode = await getOtpMode();

  if (isMockOtpEnabledForMode(mode)) {
    assertTestMockAllowed(phone);
    return true;
  }

  if (mode === "test") {
    throw new Error("OTP mock mode is not configured");
  }

  if (process.env.OTP_PROVIDER !== "startmessaging") {
    if (!process.env.OTP_PROVIDER) {
      throw new Error("OTP provider is not configured");
    }

    throw new Error(`OTP provider "${process.env.OTP_PROVIDER}" is not configured for LIVE mode`);
  }

  if (!process.env.OTP_API_KEY) {
    throw new Error("OTP_API_KEY is not configured");
  }

  return true;
}

export async function verifyOtp(phone, otp) {
  await connectDB();
  await canVerifyOtp(phone);

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
