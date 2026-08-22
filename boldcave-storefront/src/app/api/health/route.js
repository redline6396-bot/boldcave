import { success, handleRouteError, noStoreHeaders } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET() {
  try {
    return success(
      {
        service: "api",
        status: "ok",
      },
      200,
      { headers: noStoreHeaders }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
