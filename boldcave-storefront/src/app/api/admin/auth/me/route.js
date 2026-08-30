import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { requireAdmin } from "@/lib/auth/session";
import { failure, success } from "@/lib/api/response";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);

    if (auth.response) {
      return applyAdminCors(request, auth.response);
    }

    return applyAdminCors(
      request,
      success({
        admin: {
          id: "admin",
        },
      })
    );
  } catch (error) {
    console.error("Admin auth/me error:", error);

    return applyAdminCors(
      request,
      failure(
        "ADMIN_AUTH_FAILED",
        "Unable to verify admin session",
        500
      )
    );
  }
}