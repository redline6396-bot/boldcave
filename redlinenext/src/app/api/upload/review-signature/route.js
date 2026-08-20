import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/session";
import { createUploadSignature } from "@/lib/cloudinary/server";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;

    const body = await readJson(request);
    const folder = body.folder === "reviews" ? "reviews" : "reviews";
    const signature = createUploadSignature({ folder });

    return success(signature);
  } catch (error) {
    if (error.message?.includes("not configured")) {
      return failure("CLOUDINARY_NOT_CONFIGURED", error.message, 503);
    }

    return handleRouteError(error, "REVIEW_UPLOAD_SIGNATURE_FAILED");
  }
}
