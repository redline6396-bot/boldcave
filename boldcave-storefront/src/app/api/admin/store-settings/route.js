import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { handleRouteError, noStoreHeaders, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
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
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const body = await readJson(request);
    await connectDB();
    const settings = await updateStoreSettings({
      acceptingOrders: body.acceptingOrders !== false,
    });

    return applyAdminCors(
      request,
      success(serializeStoreSettings(settings), 200, {
        headers: noStoreHeaders,
      })
    );
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error));
  }
}
