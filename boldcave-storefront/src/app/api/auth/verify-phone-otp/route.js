import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/session";
import { verifyOtp } from "@/lib/auth/otpProvider";
import { isValidPhone, normalizePhone } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;

    const body = await readJson(request);
    const phone = normalizePhone(body.phone);
    const otp = String(body.otp || "").trim();

    if (!isValidPhone(phone)) {
      return failure("INVALID_PHONE", "Enter a valid 10 digit Indian phone number", 400);
    }

    if (!/^\d{6}$/.test(otp)) {
      return failure("INVALID_OTP", "Enter the complete 6 digit OTP.", 400);
    }

    const result = await verifyOtp(phone, otp);
    if (!result.verified) {
      return failure(
        result.code || "OTP_VERIFICATION_FAILED",
        result.reason || "Incorrect verification code.",
        401
      );
    }

    return success({ phoneVerified: true, phone });
  } catch (error) {
    return handleRouteError(error, "OTP_PHONE_VERIFY_FAILED");
  }
}
