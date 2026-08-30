import connectDB from "@/lib/db";
import { handleRouteError, publicSettingsCacheHeaders, success } from "@/lib/api/response";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { getSerializedStoreSettings } from "@/lib/storeSettings";

export const runtime = "nodejs";

export async function GET() {
  return withRuntimeDatabase(() => getStoreSettingsRoute());
}

async function getStoreSettingsRoute() {
  try {
    await connectDB();
    return success(await getSerializedStoreSettings(), 200, {
      headers: publicSettingsCacheHeaders,
    });
  } catch (error) {
    return handleRouteError(error, "STORE_SETTINGS_FAILED");
  }
}
