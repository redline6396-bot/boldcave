import { failure, readJson, success } from "@/lib/api/response";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import {
  setAdminSessionCookie,
  signAdminSession,
} from "@/lib/auth/session";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function POST(request) {
  try {
    const body = await readJson(request);

    const email = String(body.email || "").trim();
    const password = String(body.password || "");

    if (
      !process.env.ADMIN_EMAIL ||
      !process.env.ADMIN_PASSWORD
    ) {
      return applyAdminCors(
        request,
        failure(
          "CONFIGURATION_ERROR",
          "Admin credentials are not configured",
          503
        )
      );
    }

    if (
      email !== process.env.ADMIN_EMAIL ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return applyAdminCors(
        request,
        failure(
          "INVALID_CREDENTIALS",
          "Invalid credentials",
          401
        )
      );
    }

    const token = signAdminSession();

    const response = success({
      admin: { email },
      token,
    });

    setAdminSessionCookie(response, token);

    return applyAdminCors(request, response);
  } catch (error) {
    console.error("Admin login error", {
      name: error?.name,
      code: error?.code,
    });

    return applyAdminCors(
      request,
      failure(
        "CONFIGURATION_ERROR",
        "Admin auth is not configured",
        503
      )
    );
  }
}
