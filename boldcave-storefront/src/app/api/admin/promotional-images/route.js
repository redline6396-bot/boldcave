import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, noStoreHeaders, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import {
  destroyPromotionalImage,
  MAX_PROMOTIONAL_IMAGE_BYTES,
  uploadPromotionalImage,
} from "@/lib/cloudinary/server";
import { getStoreSettings } from "@/lib/storeSettings";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_PROMOTIONAL_IMAGE_BYTES + 512 * 1024) {
      return applyAdminCors(
        request,
        failure("PROMOTIONAL_IMAGE_TOO_LARGE", "Promotional images must be 5 MB or smaller.", 413)
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return applyAdminCors(
        request,
        failure("PROMOTIONAL_IMAGE_REQUIRED", "Choose a promotional image to upload.", 400)
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const image = await uploadPromotionalImage(buffer, file.type);
    return applyAdminCors(
      request,
      success({ image }, 201, { headers: noStoreHeaders })
    );
  } catch (error) {
    const validationResponse = promotionalImageErrorResponse(error);
    if (validationResponse) return applyAdminCors(request, validationResponse);
    return applyAdminCors(request, handleRouteError(error, "PROMOTIONAL_IMAGE_UPLOAD_FAILED"));
  }
}

export async function DELETE(request) {
  return withRuntimeDatabase(() => deletePromotionalImageRoute(request));
}

async function deletePromotionalImageRoute(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const body = await readJson(request);
    const publicId = String(body.publicId || "").trim();
    await connectDB();
    const settings = await getStoreSettings();

    if (settings?.customerMessaging?.promotionalImage?.publicId === publicId) {
      return applyAdminCors(
        request,
        failure(
          "PROMOTIONAL_IMAGE_IN_USE",
          "This image is the saved global promotional image and cannot be removed as a temporary upload.",
          409
        )
      );
    }

    await destroyPromotionalImage(publicId);
    return applyAdminCors(
      request,
      success({ deleted: true }, 200, { headers: noStoreHeaders })
    );
  } catch (error) {
    const validationResponse = promotionalImageErrorResponse(error);
    if (validationResponse) return applyAdminCors(request, validationResponse);
    return applyAdminCors(request, handleRouteError(error, "PROMOTIONAL_IMAGE_DELETE_FAILED"));
  }
}

function promotionalImageErrorResponse(error) {
  const messages = {
    PROMOTIONAL_IMAGE_TYPE_INVALID: [
      "PROMOTIONAL_IMAGE_TYPE_INVALID",
      "Use a JPG, PNG, or WebP image.",
      415,
    ],
    PROMOTIONAL_IMAGE_EMPTY: [
      "PROMOTIONAL_IMAGE_EMPTY",
      "The selected image is empty.",
      400,
    ],
    PROMOTIONAL_IMAGE_TOO_LARGE: [
      "PROMOTIONAL_IMAGE_TOO_LARGE",
      "Promotional images must be 5 MB or smaller.",
      413,
    ],
    PROMOTIONAL_IMAGE_CONTENT_INVALID: [
      "PROMOTIONAL_IMAGE_CONTENT_INVALID",
      "The file contents do not match a supported image type.",
      415,
    ],
    PROMOTIONAL_IMAGE_NOT_OWNED: [
      "PROMOTIONAL_IMAGE_NOT_OWNED",
      "Only promotional messaging images can be removed here.",
      400,
    ],
    PROMOTIONAL_IMAGE_UPLOAD_INVALID: [
      "PROMOTIONAL_IMAGE_UPLOAD_INVALID",
      "Cloudinary did not return a valid promotional image.",
      502,
    ],
  };
  const response = messages[error?.message];
  return response ? failure(...response) : null;
}
