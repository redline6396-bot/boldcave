import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { lookupIndianPincode } from "@/lib/shipping/pincodeLookup";
import { checkServiceability } from "@/lib/shipping/shiprocket";
import { isValidPincode } from "@/lib/validation";

export const runtime = "nodejs";

function locationDetails(location) {
  if (!location?.city && !location?.state) return undefined;

  return {
    city: location.city || "",
    state: location.state || "",
    location,
  };
}

export async function POST(request) {
  let location = { city: "", state: "" };

  try {
    const body = await readJson(request);
    const pincode = String(body.pincode || body.deliveryPincode || "").trim();

    if (!isValidPincode(pincode)) {
      return failure("INVALID_PINCODE", "Invalid pincode", 400);
    }

    location = await lookupIndianPincode(pincode);
    const result = await checkServiceability({
      deliveryPincode: pincode,
      cod: Boolean(body.cod),
    });

    return success({
      ...result,
      city: result.city || location.city,
      state: result.state || location.state,
      location: {
        ...(result.location || {}),
        city: result.location?.city || result.city || location.city,
        state: result.location?.state || result.state || location.state,
      },
    });
  } catch (error) {
    if (error.message?.includes("not configured")) {
      return failure("SHIPROCKET_NOT_CONFIGURED", error.message, 503);
    }

    return failure(
      "SHIPROCKET_TEMPORARY_ERROR",
      "Shipping serviceability could not be checked right now",
      503,
      locationDetails(location)
    );
  }
}

export async function GET(request) {
  let location = { city: "", state: "" };

  try {
    const { searchParams } = new URL(request.url);
    const pincode = String(searchParams.get("pincode") || "").trim();

    if (!isValidPincode(pincode)) {
      return failure("INVALID_PINCODE", "Invalid pincode", 400);
    }

    location = await lookupIndianPincode(pincode);
    const result = await checkServiceability({
      deliveryPincode: pincode,
      cod: searchParams.get("cod") === "true",
    });

    return success({
      ...result,
      city: result.city || location.city,
      state: result.state || location.state,
      location: {
        ...(result.location || {}),
        city: result.location?.city || result.city || location.city,
        state: result.location?.state || result.state || location.state,
      },
    });
  } catch (error) {
    if (error.message?.includes("not configured")) {
      return failure("SHIPROCKET_NOT_CONFIGURED", error.message, 503);
    }

    return failure(
      "SHIPROCKET_TEMPORARY_ERROR",
      "Shipping serviceability could not be checked right now",
      503,
      locationDetails(location)
    );
  }
}
