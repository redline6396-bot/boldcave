import { failure, handleRouteError, success } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { createUploadSignature } from "@/lib/cloudinary/server";

export const runtime = "nodejs";

export async function POST(request) {
  return withRuntimeDatabase(() => createReviewUploadSignatureRoute(request));
}

async function createReviewUploadSignatureRoute(request) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;

    const signature = createUploadSignature({ folder: "reviews" });

    return success(signature);
  } catch (error) {
    if (error.message?.includes("not configured")) {
      return failure("CLOUDINARY_NOT_CONFIGURED", "Upload service is not configured.", 503);
    }

    return handleRouteError(error, "REVIEW_UPLOAD_SIGNATURE_FAILED");
  }
}
