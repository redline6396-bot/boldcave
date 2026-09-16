import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import {
  getDelhiveryPickupSettings,
  setDelhiveryAutoPickupEnabled,
} from "@/lib/shipping/delhiveryPickup";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function GET(request) {
  return withRuntimeDatabase(() => getPickupSettingsRoute(request));
}

async function getPickupSettingsRoute(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);
    await connectDB();
    return applyAdminCors(
      request,
      success({ delhiveryPickup: await getDelhiveryPickupSettings() })
    );
  } catch (error) {
    return applyAdminCors(
      request,
      handleRouteError(error, "DELHIVERY_PICKUP_SETTINGS_FAILED")
    );
  }
}

export async function PATCH(request) {
  return withRuntimeDatabase(() => updatePickupSettingsRoute(request));
}

async function updatePickupSettingsRoute(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);
    const body = await readJson(request);
    if (typeof body.autoPickupEnabled !== "boolean") {
      return applyAdminCors(
        request,
        failure(
          "INVALID_DELHIVERY_PICKUP_SETTING",
          "autoPickupEnabled must be a boolean.",
          400
        )
      );
    }
    await connectDB();
    const settings = await setDelhiveryAutoPickupEnabled(body.autoPickupEnabled);
    return applyAdminCors(request, success({ delhiveryPickup: settings }));
  } catch (error) {
    return applyAdminCors(
      request,
      handleRouteError(error, "DELHIVERY_PICKUP_SETTINGS_UPDATE_FAILED")
    );
  }
}

