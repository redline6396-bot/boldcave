import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, noStoreHeaders, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import {
  destroyPromotionalImage,
  isOwnedPromotionalImagePublicId,
  verifyPromotionalImage,
} from "@/lib/cloudinary/server";
import { cleanString, isValidEmail } from "@/lib/validation";
import {
  getStoreSettings,
  getSerializedStoreSettings,
  normalizeStorefrontUrl,
  serializePromotionalImage,
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
    await connectDB();
    const currentSettings = await getStoreSettings();
    const previousPromotionalImage = serializePromotionalImage(
      currentSettings?.customerMessaging?.promotionalImage
    );
    const customerMessaging = await validateCustomerMessaging(
      body.customerMessaging,
      previousPromotionalImage
    );
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

    const nextPromotionalImage = serializePromotionalImage(
      settings?.customerMessaging?.promotionalImage
    );
    if (
      customerMessaging?.value &&
      previousPromotionalImage?.publicId &&
      previousPromotionalImage.publicId !== nextPromotionalImage?.publicId &&
      isOwnedPromotionalImagePublicId(previousPromotionalImage.publicId)
    ) {
      await destroyPromotionalImage(previousPromotionalImage.publicId).catch((error) => {
        console.error("Previous promotional image cleanup failed", {
          publicId: previousPromotionalImage.publicId,
          code: error?.code || error?.name,
        });
      });
    }

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

async function validateCustomerMessaging(value, currentPromotionalImage) {
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

  let promotionalImage = currentPromotionalImage || null;
  if (Object.prototype.hasOwnProperty.call(value, "promotionalImage")) {
    if (value.promotionalImage === null) {
      promotionalImage = null;
    } else if (
      !value.promotionalImage ||
      typeof value.promotionalImage !== "object" ||
      Array.isArray(value.promotionalImage)
    ) {
      return { error: "Promotional image settings are invalid." };
    } else {
      const requestedPublicId = cleanString(value.promotionalImage.publicId, 301);
      if (!isOwnedPromotionalImagePublicId(requestedPublicId)) {
        return { error: "Select an image uploaded through Promotional Messaging." };
      }

      if (requestedPublicId === currentPromotionalImage?.publicId) {
        promotionalImage = currentPromotionalImage;
      } else {
        try {
          promotionalImage = await verifyPromotionalImage(requestedPublicId);
        } catch {
          return { error: "The selected promotional image could not be verified." };
        }
      }
    }
  }

  return { value: { defaultMessage, siteUrl, promotionalImage } };
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
