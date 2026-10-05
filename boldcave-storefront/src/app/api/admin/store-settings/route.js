import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, noStoreHeaders, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { cleanString, isValidEmail } from "@/lib/validation";
import {
  getSerializedStoreSettings,
  normalizeStorefrontUrl,
  serializeStoreSettings,
  updateStoreSettings,
} from "@/lib/storeSettings";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function GET(request) {
  return withRuntimeDatabase(() => getAdminStoreSettingsRoute(request));
}

async function getAdminStoreSettingsRoute(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    await connectDB();
    return applyAdminCors(
      request,
      success(await getSerializedStoreSettings({ includePrivate: true }), 200, {
        headers: noStoreHeaders,
      })
    );
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error));
  }
}

export async function PATCH(request) {
  return withRuntimeDatabase(() => updateAdminStoreSettingsRoute(request));
}

async function updateAdminStoreSettingsRoute(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const body = await readJson(request);
    const customerMessaging = validateCustomerMessaging(body.customerMessaging);
    if (customerMessaging?.error) {
      return applyAdminCors(
        request,
        failure("INVALID_CUSTOMER_MESSAGING", customerMessaging.error, 400)
      );
    }
    const adminNotifications = validateAdminNotifications(body.adminNotifications);
    if (adminNotifications?.error) {
      return applyAdminCors(
        request,
        failure("INVALID_ADMIN_NOTIFICATIONS", adminNotifications.error, 400)
      );
    }

    await connectDB();
    const settings = await updateStoreSettings({
      ...(body.acceptingOrders !== undefined
        ? { acceptingOrders: body.acceptingOrders !== false }
        : {}),
      ...(body.comingSoonMode !== undefined
        ? { comingSoonMode: body.comingSoonMode === true }
        : {}),
      ...(body.codCharge !== undefined
        ? { codCharge: body.codCharge }
        : {}),
      ...(body.autoApproveReviews !== undefined
        ? { autoApproveReviews: body.autoApproveReviews === true }
        : {}),
      ...(customerMessaging?.value
        ? { customerMessaging: customerMessaging.value }
        : {}),
      ...(adminNotifications?.value
        ? { adminNotifications: adminNotifications.value }
        : {}),
    });

    return applyAdminCors(
      request,
      success(serializeStoreSettings(settings, { includePrivate: true }), 200, {
        headers: noStoreHeaders,
      })
    );
  } catch (error) {
    console.error("Store settings update failed", {
      name: error?.name,
      code: error?.code,
      message: String(error?.message || "").slice(0, 180),
    });

    if (error?.name === "ValidationError") {
      return applyAdminCors(
        request,
        failure("STORE_SETTINGS_VALIDATION_FAILED", error.message, 400)
      );
    }

    return applyAdminCors(
      request,
      failure(
        "STORE_SETTINGS_UPDATE_FAILED",
        "Unable to save store settings. Please check the values and retry.",
        500
      )
    );
  }
}

function validateCustomerMessaging(value) {
  if (value === undefined) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { error: "Customer messaging settings are invalid." };
  }

  const defaultMessage = cleanString(value.defaultMessage, 5001);
  const siteUrlInput = cleanString(value.siteUrl, 501);
  const siteUrl = normalizeStorefrontUrl(siteUrlInput);
  if (!defaultMessage) return { error: "Default message is required." };
  if (defaultMessage.length > 5000) return { error: "Default message is too long." };
  if (!siteUrl || siteUrlInput.length > 500) {
    return { error: "Enter a valid storefront URL, for example www.boldcave.com." };
  }

  return { value: { defaultMessage, siteUrl } };
}

function validateAdminNotifications(value) {
  if (value === undefined) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { error: "Owner notification settings are invalid." };
  }

  const email = cleanString(value.email, 321).toLowerCase();
  if (email && (email.length > 320 || !isValidEmail(email))) {
    return { error: "Enter a valid notification email address." };
  }

  return {
    value: {
      email,
      newCustomer: value.newCustomer !== false,
      newOrder: value.newOrder !== false,
      orderCancelled: value.orderCancelled !== false,
    },
  };
}
