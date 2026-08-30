import {
  handleRouteError,
  publicSettingsCacheHeaders,
  success,
} from "@/lib/api/response";

import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";

import { getSerializedStoreSettings } from "@/lib/storeSettings";

export const runtime = "nodejs";

export async function GET() {
  return withRuntimeDatabase(
    async ({ StoreSettings }) => {
      try {
        const settings =
          await getSerializedStoreSettings({
            StoreSettingsModel:
              StoreSettings,
          });

        return success(
          settings,
          200,
          {
            headers:
              publicSettingsCacheHeaders,
          },
        );
      } catch (error) {
        return handleRouteError(
          error,
          "STORE_SETTINGS_FAILED",
        );
      }
    },
  );
}