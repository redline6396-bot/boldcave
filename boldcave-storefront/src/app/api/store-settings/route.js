import connectDB from "@/lib/db";
import { handleRouteError, noStoreHeaders, success } from "@/lib/api/response";
import { getSerializedStoreSettings } from "@/lib/storeSettings";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectDB();
    return success(await getSerializedStoreSettings(), 200, {
      headers: noStoreHeaders,
    });
  } catch (error) {
    return handleRouteError(error, "STORE_SETTINGS_FAILED");
  }
}
