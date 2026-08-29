import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { createUploadSignature } from "@/lib/cloudinary/server";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const body = await readJson(request);
    const folder = ["products", "reviews", "homepage"].includes(body.folder) ? body.folder : "products";
    const signature = createUploadSignature({ folder });

    return applyAdminCors(request, success(signature));
  } catch (error) {
    if (error.message?.includes("not configured")) {
      return applyAdminCors(
        request,
        failure("CLOUDINARY_NOT_CONFIGURED", "Upload service is not configured.", 503)
      );
    }

    return applyAdminCors(request, handleRouteError(error, "CLOUDINARY_SIGNATURE_FAILED"));
  }
}
