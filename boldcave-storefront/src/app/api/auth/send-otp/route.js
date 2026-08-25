import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import {
  OtpDeliveryError,
  OtpRateLimitError,
  OtpTestPhoneNotAllowedError,
  sendOtp,
} from "@/lib/auth/otpProvider";
import { isValidPhone, normalizePhone } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await readJson(request);
    const phone = normalizePhone(body.phone);

    if (!isValidPhone(phone)) {
      return failure("INVALID_PHONE", "Enter a valid 10 digit Indian phone number", 400);
    }

    const result = await sendOtp(phone);

    return success({
      phone,
      expiresAt: result.expiresAt,
      provider: result.provider,
      ...(result.demoOtp ? { demoOtp: result.demoOtp } : {}),
    });
  } catch (error) {
    if (error instanceof OtpRateLimitError) {
      return failure(error.code, error.message, 429, {
        retryAfterSeconds: error.retryAfterSeconds,
      });
    }

    if (error instanceof OtpDeliveryError) {
      return failure(error.code, error.message, 503);
    }

    if (error instanceof OtpTestPhoneNotAllowedError) {
      return failure(error.code, error.message, 403);
    }

    return handleRouteError(error, "OTP_SEND_FAILED");
  }
}
