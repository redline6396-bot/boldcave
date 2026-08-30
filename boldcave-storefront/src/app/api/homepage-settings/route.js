import connectDB from "@/lib/db";
import { handleRouteError, publicSettingsCacheHeaders, success } from "@/lib/api/response";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { getSerializedHomepageSettings } from "@/lib/homepageSettings";

export const runtime = "nodejs";

export async function GET() {
  return withRuntimeDatabase(() => getHomepageSettingsRoute());
}

async function getHomepageSettingsRoute() {
  try {
    await connectDB();
    return success(await getSerializedHomepageSettings(), 200, {
      headers: publicSettingsCacheHeaders,
    });
  } catch (error) {
    return handleRouteError(error, "HOMEPAGE_SETTINGS_FAILED");
  }
}
