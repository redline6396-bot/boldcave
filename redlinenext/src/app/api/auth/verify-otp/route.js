import connectDB from "@/lib/db";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { setUserSessionCookie, signUserSession, safeUser } from "@/lib/auth/session";
import { verifyOtp } from "@/lib/auth/otpProvider";
import { findOrCreateUserForPhone } from "@/lib/auth/users";
import { isValidPhone, normalizePhone } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request) {
  try {
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

    await connectDB();
    const user = await findOrCreateUserForPhone(phone);

    if (!user) {
      return failure("USER_LOGIN_FAILED", "Something went wrong. Please try again.", 500);
    }

    if (user.status === "suspended") {
      return failure("USER_SUSPENDED", "This account is suspended", 403);
    }

    if (!user.phoneVerified) {
      user.phoneVerified = true;
      await user.save();
    }

    const token = signUserSession(user);
    const response = success({ user: safeUser(user) });
    return setUserSessionCookie(response, token);
  } catch (error) {
    return handleRouteError(error, "OTP_VERIFY_FAILED");
  }
}
