import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { checkServiceability } from "@/lib/shipping/shiprocket";
import { isValidPincode } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await readJson(request);
    const pincode = String(body.pincode || body.deliveryPincode || "").trim();

    if (!isValidPincode(pincode)) {
      return failure("INVALID_PINCODE", "Invalid pincode", 400);
    }

    const result = await checkServiceability({
      deliveryPincode: pincode,
      cod: Boolean(body.cod),
    });

    return success(result);
  } catch (error) {
    if (error.message?.includes("not configured")) {
      return failure("SHIPROCKET_NOT_CONFIGURED", error.message, 503);
    }

    return failure(
      "SHIPROCKET_TEMPORARY_ERROR",
      "Shipping serviceability could not be checked right now",
      503
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pincode = String(searchParams.get("pincode") || "").trim();

    if (!isValidPincode(pincode)) {
      return failure("INVALID_PINCODE", "Invalid pincode", 400);
    }

    const result = await checkServiceability({
      deliveryPincode: pincode,
      cod: searchParams.get("cod") === "true",
    });

    return success(result);
  } catch (error) {
    if (error.message?.includes("not configured")) {
      return failure("SHIPROCKET_NOT_CONFIGURED", error.message, 503);
    }

    return failure(
      "SHIPROCKET_TEMPORARY_ERROR",
      "Shipping serviceability could not be checked right now",
      503
    );
  }
}
