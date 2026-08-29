import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import connectDB from "@/lib/db";
import { calculateCart } from "@/lib/orders/pricing";
import { lookupIndianPincode } from "@/lib/shipping/pincodeLookup";
import {
  checkServiceability,
  validateCheckoutServiceability,
} from "@/lib/shipping/shiprocket";
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

async function getServiceabilityResult({ pincode, cod, items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return checkServiceability({
      deliveryPincode: pincode,
      cod,
    });
  }

  await connectDB();
  const cart = await calculateCart({ items });
  if (cart.error) {
    return {
      serviceable: false,
      code: cart.error.code,
      message: cart.error.message,
      status: cart.error.status,
      details: cart.error.details,
    };
  }

  const serviceability = await validateCheckoutServiceability({
    deliveryPincode: pincode,
    cod,
    items: cart.items,
  });

  if (!serviceability.ok) {
    return {
      serviceable: false,
      code: serviceability.code,
      message: serviceability.message,
      status: serviceability.status,
      retryable: serviceability.retryable,
    };
  }

  return serviceability.result;
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
    const result = await getServiceabilityResult({
      pincode,
      cod: Boolean(body.cod),
      items: body.items,
    });

    if (result.status && !result.serviceable) {
      return failure(
        result.code || "SHIPROCKET_TEMPORARY_ERROR",
        result.message || "Shipping serviceability could not be checked right now",
        result.status,
        {
          ...(result.details || {}),
          ...locationDetails(location),
          retryable: result.retryable,
        }
      );
    }

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
      return failure("SHIPROCKET_NOT_CONFIGURED", "Shipping service is not configured.", 503);
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
      return failure("SHIPROCKET_NOT_CONFIGURED", "Shipping service is not configured.", 503);
    }

    return failure(
      "SHIPROCKET_TEMPORARY_ERROR",
      "Shipping serviceability could not be checked right now",
      503,
      locationDetails(location)
    );
  }
}
