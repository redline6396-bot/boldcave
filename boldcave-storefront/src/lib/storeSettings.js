import StoreSettings from "@/models/StoreSettings";

const GLOBAL_STORE_SETTINGS_KEY = "global";

const STORE_SETTINGS_CACHE_TTL_MS =
  60 * 1000;

const DEFAULT_COD_CHARGE = {
  enabled: false,
  chargeType: "fixed",
  chargeValue: 0,
};

export const DEFAULT_CUSTOMER_MESSAGE = `Hi {{name}},

We've got something special for you from Bold Cave.

Use code {{coupon_code}} on your next order and enjoy the offer.

Shop now: {{site_url}}

Thank you for choosing Bold Cave.`;

const DEFAULT_ADMIN_NOTIFICATIONS = {
  email: "",
  newCustomer: true,
  newOrder: true,
  orderCancelled: true,
};

const cacheStore =
  globalThis.__storeSettingsCache || {
    publicEntry: null,
    privateEntry: null,
  };

globalThis.__storeSettingsCache = cacheStore;

function getEnvOtpMode() {
  return (
    process.env.OTP_PROVIDER === "mock" &&
    process.env.OTP_MOCK_ENABLED === "true"
  )
    ? "test"
    : "live";
}

export function serializeStoreSettings(settings, { includePrivate = false } = {}) {
  const serialized = {
    acceptingOrders:
      settings?.acceptingOrders !== false,

    comingSoonMode:
      settings?.comingSoonMode === true,

    codCharge:
      serializeCodChargeSettings(
        settings?.codCharge,
      ),

    autoApproveReviews:
      settings?.autoApproveReviews === true,

    updatedAt:
      settings?.updatedAt || null,
  };

  if (includePrivate) {
    serialized.customerMessaging = serializeCustomerMessaging(
      settings?.customerMessaging
    );
    serialized.adminNotifications = serializeAdminNotifications(
      settings?.adminNotifications
    );
  }

  return serialized;
}

export function serializeCustomerMessaging(value = {}) {
  const configuredSiteUrl =
    String(value?.siteUrl || "").trim() ||
    String(process.env.STOREFRONT_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").trim();

  return {
    defaultMessage:
      String(value?.defaultMessage || "").trim() || DEFAULT_CUSTOMER_MESSAGE,
    siteUrl: formatStorefrontUrlForDisplay(configuredSiteUrl),
    promotionalImage: serializePromotionalImage(value?.promotionalImage),
  };
}

export function serializePromotionalImage(value) {
  const url = String(value?.url || "").trim();
  const publicId = String(value?.publicId || "").trim();
  if (!url || !publicId) return null;

  return {
    url,
    publicId,
    width: Math.max(0, Number(value?.width || 0)),
    height: Math.max(0, Number(value?.height || 0)),
    format: String(value?.format || "").trim().toLowerCase(),
    bytes: Math.max(0, Number(value?.bytes || 0)),
  };
}

export function formatStorefrontUrlForDisplay(value) {
  return normalizeStorefrontUrl(value).replace(/^https?:\/\//i, "");
}

export function normalizeStorefrontUrl(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";

  const hasProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(rawValue);
  const domainWithoutProtocol = /^(?:www\.)?[a-z\d-]+(?:\.[a-z\d-]+)+(?::\d+)?(?:[/?#].*)?$/i;
  const candidate = hasProtocol
    ? rawValue
    : domainWithoutProtocol.test(rawValue)
      ? `https://${rawValue}`
      : "";

  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

export function serializeAdminNotifications(value = {}) {
  return {
    email: String(value?.email || "").trim().toLowerCase(),
    newCustomer: value?.newCustomer !== false,
    newOrder: value?.newOrder !== false,
    orderCancelled: value?.orderCancelled !== false,
  };
}

export function serializeCodChargeSettings(
  codCharge = {},
) {
  const chargeType =
    codCharge?.chargeType === "percentage"
      ? "percentage"
      : "fixed";

  const rawValue = Number(
    codCharge?.chargeValue,
  );

  const chargeValue =
    Number.isFinite(rawValue) &&
    rawValue > 0
      ? rawValue
      : 0;

  return {
    enabled:
      codCharge?.enabled === true,

    chargeType,

    chargeValue:
      chargeType === "percentage"
        ? Math.min(100, chargeValue)
        : chargeValue,
  };
}

export async function getStoreSettings({
  StoreSettingsModel = StoreSettings,
} = {}) {
  return StoreSettingsModel.findOneAndUpdate(
    {
      key: GLOBAL_STORE_SETTINGS_KEY,
    },
    {
      $setOnInsert: {
        key: GLOBAL_STORE_SETTINGS_KEY,
        acceptingOrders: true,
        comingSoonMode: false,
        codCharge:
          DEFAULT_COD_CHARGE,
        customerMessaging: {
          defaultMessage: DEFAULT_CUSTOMER_MESSAGE,
          siteUrl: String(
            process.env.STOREFRONT_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || ""
          ).trim(),
          promotionalImage: null,
        },
        adminNotifications: DEFAULT_ADMIN_NOTIFICATIONS,
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    },
  ).exec();
}

export function clearStoreSettingsCache() {
  cacheStore.publicEntry = null;
  cacheStore.privateEntry = null;
}

export async function getSerializedStoreSettings({
  cache = true,
  StoreSettingsModel = StoreSettings,
  includePrivate = false,
} = {}) {
  const cacheKey = includePrivate ? "privateEntry" : "publicEntry";
  if (
    cache &&
    cacheStore[cacheKey]?.expiresAt >
      Date.now()
  ) {
    return cacheStore[cacheKey].value;
  }

  const settings =
    await getStoreSettings({
      StoreSettingsModel,
    });

  const value =
    serializeStoreSettings(settings, { includePrivate });

  if (cache) {
    cacheStore[cacheKey] = {
      value,
      expiresAt:
        Date.now() +
        STORE_SETTINGS_CACHE_TTL_MS,
    };
  }

  return value;
}

export async function updateStoreSettings({
  acceptingOrders,
  comingSoonMode,
  codCharge,
  autoApproveReviews,
  customerMessaging,
  adminNotifications,
  StoreSettingsModel = StoreSettings,
} = {}) {
  const updates = {};

  if (acceptingOrders !== undefined) {
    updates.acceptingOrders =
      acceptingOrders !== false;
  }

  if (comingSoonMode !== undefined) {
    updates.comingSoonMode =
      comingSoonMode === true;
  }

  if (autoApproveReviews !== undefined) {
    updates.autoApproveReviews =
      autoApproveReviews === true;
  }

  if (customerMessaging && typeof customerMessaging === "object") {
    updates.customerMessaging = serializeCustomerMessaging(customerMessaging);
  }

  if (adminNotifications && typeof adminNotifications === "object") {
    updates.adminNotifications = serializeAdminNotifications(adminNotifications);
  }

  if (
    codCharge &&
    typeof codCharge === "object"
  ) {
    const normalizedCodCharge =
      serializeCodChargeSettings(
        codCharge,
      );

    updates.codCharge =
      normalizedCodCharge;
  }

  const update = {
    $setOnInsert: {
      key: GLOBAL_STORE_SETTINGS_KEY,
      acceptingOrders: true,
      comingSoonMode: false,
      codCharge:
        DEFAULT_COD_CHARGE,
      customerMessaging: {
        defaultMessage: DEFAULT_CUSTOMER_MESSAGE,
        siteUrl: String(
          process.env.STOREFRONT_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || ""
        ).trim(),
        promotionalImage: null,
      },
      adminNotifications: DEFAULT_ADMIN_NOTIFICATIONS,
    },
  };

  if (Object.keys(updates).length) {
    Object.keys(updates).forEach(
      (key) => {
        delete update.$setOnInsert[key];
      },
    );

    update.$set = updates;
  }

  const settings =
    await StoreSettingsModel.findOneAndUpdate(
      {
        key: GLOBAL_STORE_SETTINGS_KEY,
      },
      update,
      {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
      },
    ).exec();

  cacheStore.publicEntry = {
    value:
      serializeStoreSettings(settings),

    expiresAt:
      Date.now() +
      STORE_SETTINGS_CACHE_TTL_MS,
  };
  cacheStore.privateEntry = {
    value: serializeStoreSettings(settings, { includePrivate: true }),
    expiresAt: Date.now() + STORE_SETTINGS_CACHE_TTL_MS,
  };

  return settings;
}

export async function isAcceptingOrders({
  StoreSettingsModel = StoreSettings,
} = {}) {
  const settings =
    await getStoreSettings({
      StoreSettingsModel,
    });

  return (
    settings.acceptingOrders !== false
  );
}

export async function getOtpMode() {
  return getEnvOtpMode();
}
