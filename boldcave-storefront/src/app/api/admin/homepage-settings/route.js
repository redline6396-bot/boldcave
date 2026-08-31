import connectDB from "@/lib/db";
import { revalidatePath } from "next/cache";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { handleRouteError, noStoreHeaders, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import {
  getSerializedHomepageSettings,
  serializeHomepageSettings,
  updateHomepageSettings,
} from "@/lib/homepageSettings";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function GET(request) {
  return withRuntimeDatabase(() => getAdminHomepageSettingsRoute(request));
}

async function getAdminHomepageSettingsRoute(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    await connectDB();
    return applyAdminCors(
      request,
      success(await getSerializedHomepageSettings(), 200, {
        headers: noStoreHeaders,
      })
    );
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error));
  }
}

export async function PATCH(request) {
  return withRuntimeDatabase(() => updateAdminHomepageSettingsRoute(request));
}

async function updateAdminHomepageSettingsRoute(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const body = await readJson(request);
    await connectDB();
    const settings = await updateHomepageSettings({
      heroSlides: body.heroSlides,
      featuredReviews: body.featuredReviews,
      collectionFragranceCount: body.collectionFragranceCount,
      collectionPersonalityCount: body.collectionPersonalityCount,
    });
    revalidatePath("/");

    return applyAdminCors(
      request,
      success(serializeHomepageSettings(settings), 200, {
        headers: noStoreHeaders,
      })
    );
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error, "HOMEPAGE_SETTINGS_UPDATE_FAILED"));
  }
}
