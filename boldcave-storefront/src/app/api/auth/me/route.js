import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireUser, safeUser } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { cleanString, isValidEmail, isValidPincode } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request) {
  return withRuntimeDatabase(() => getMeRoute(request));
}

async function getMeRoute(request) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;

    return success({ user: safeUser(auth.user) });
  } catch (error) {
    return handleRouteError(error);
  }
}

function normalizeAddresses(addresses) {
  if (!Array.isArray(addresses)) {
    return { addresses: [] };
  }

  const normalized = [];

  for (const address of addresses.slice(0, 10)) {
    const entry = {
      fullName: cleanString(address.fullName, 160),
      email: cleanString(address.email, 160).toLowerCase(),
      addressLine: cleanString(address.addressLine, 500),
      city: cleanString(address.city, 120),
      state: cleanString(address.state, 120),
      pincode: cleanString(address.pincode, 6),
      type: address.type === "Work" ? "Work" : "Home",
      isDefault: Boolean(address.isDefault),
    };

    if (!entry.fullName || !entry.addressLine || !entry.city || !entry.state) {
      return { error: "Each address needs fullName, addressLine, city, and state" };
    }

    if (!isValidPincode(entry.pincode)) {
      return { error: "Each address needs a valid 6 digit pincode" };
    }

    if (entry.email && !isValidEmail(entry.email)) {
      return { error: "Address email is invalid" };
    }

    normalized.push(entry);
  }

  if (normalized.filter((address) => address.isDefault).length > 1) {
    return { error: "Only one address can be default" };
  }

  return { addresses: normalized };
}

export async function PATCH(request) {
  return withRuntimeDatabase(() => updateMeRoute(request));
}

async function updateMeRoute(request) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;

    const body = await readJson(request);
    const updates = {};

    if (body.firstName !== undefined) updates.firstName = cleanString(body.firstName, 100);
    if (body.lastName !== undefined) updates.lastName = cleanString(body.lastName, 100);
    if (body.email !== undefined) {
      const email = cleanString(body.email, 160).toLowerCase();
      if (email && !isValidEmail(email)) {
        return failure("INVALID_EMAIL", "Invalid email", 400);
      }
      updates.email = email;
    }

    if (body.addresses !== undefined) {
      const result = normalizeAddresses(body.addresses);
      if (result.error) {
        return failure("INVALID_ADDRESS", result.error, 400);
      }
      updates.addresses = result.addresses;
    }

    Object.assign(auth.user, updates);
    await auth.user.save();

    return success({ user: safeUser(auth.user) });
  } catch (error) {
    return handleRouteError(error, "PROFILE_UPDATE_FAILED");
  }
}
