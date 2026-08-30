import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, noStoreHeaders, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import {
  getSerializedStoreSettings,
  serializeStoreSettings,
  updateStoreSettings,
} from "@/lib/storeSettings";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function GET(request) {
  return withRuntimeDatabase(() => getAdminStoreSettingsRoute(request));
}

async function getAdminStoreSettingsRoute(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    await connectDB();
    return applyAdminCors(
      request,
      success(await getSerializedStoreSettings(), 200, {
        headers: noStoreHeaders,
      })
    );
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error));
  }
}

export async function PATCH(request) {
  return withRuntimeDatabase(() => updateAdminStoreSettingsRoute(request));
}

async function updateAdminStoreSettingsRoute(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const body = await readJson(request);
    await connectDB();
    const settings = await updateStoreSettings({
      ...(body.acceptingOrders !== undefined
        ? { acceptingOrders: body.acceptingOrders !== false }
        : {}),
      ...(body.prepaidDiscount !== undefined
        ? { prepaidDiscount: body.prepaidDiscount }
        : {}),
    });

    return applyAdminCors(
      request,
      success(serializeStoreSettings(settings), 200, {
        headers: noStoreHeaders,
      })
    );
  } catch (error) {
    console.error("Store settings update failed", {
      name: error?.name,
      code: error?.code,
      message: error?.message,
    });

    if (error?.name === "ValidationError") {
      return applyAdminCors(
        request,
        failure("STORE_SETTINGS_VALIDATION_FAILED", error.message, 400)
      );
    }

    return applyAdminCors(
      request,
      failure(
        "STORE_SETTINGS_UPDATE_FAILED",
        "Unable to save store settings. Please check the values and retry.",
        500
      )
    );
  }
}
