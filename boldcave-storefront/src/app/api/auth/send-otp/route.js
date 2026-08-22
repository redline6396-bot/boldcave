import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { sendOtp } from "@/lib/auth/otpProvider";
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
      ...(result.devOtp ? { devOtp: result.devOtp } : {}),
    });
  } catch (error) {
    return handleRouteError(error, "OTP_SEND_FAILED");
  }
}
