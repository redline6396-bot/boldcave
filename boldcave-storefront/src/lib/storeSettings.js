import StoreSettings from "@/models/StoreSettings";

const GLOBAL_STORE_SETTINGS_KEY = "global";

const STORE_SETTINGS_CACHE_TTL_MS =
  60 * 1000;

const DEFAULT_PREPAID_DISCOUNT = {
  enabled: true,
  discountType: "percentage",
  discountValue: 10,
  allowCouponStacking: true,
};

const cacheStore =
  globalThis.__storeSettingsCache || {
    entry: null,
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

export function serializeStoreSettings(
  settings,
) {
  return {
    acceptingOrders:
      settings?.acceptingOrders !== false,

    prepaidDiscount:
      serializePrepaidDiscountSettings(
        settings?.prepaidDiscount,
      ),

    updatedAt:
      settings?.updatedAt || null,
  };
}

export function serializePrepaidDiscountSettings(
  prepaidDiscount = {},
) {
  const discountType =
    prepaidDiscount?.discountType === "fixed"
      ? "fixed"
      : "percentage";

  const rawValue = Number(
    prepaidDiscount?.discountValue,
  );

  const discountValue =
    Number.isFinite(rawValue) &&
    rawValue > 0
      ? rawValue
      : 0;

  return {
    enabled:
      prepaidDiscount?.enabled !== false,

    discountType,

    discountValue:
      discountType === "percentage"
        ? Math.min(100, discountValue)
        : discountValue,

    allowCouponStacking:
      prepaidDiscount?.allowCouponStacking !==
      false,
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
        prepaidDiscount:
          DEFAULT_PREPAID_DISCOUNT,
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
  cacheStore.entry = null;
}

export async function getSerializedStoreSettings({
  cache = true,
  StoreSettingsModel = StoreSettings,
} = {}) {
  if (
    cache &&
    cacheStore.entry?.expiresAt >
      Date.now()
  ) {
    return cacheStore.entry.value;
  }

  const settings =
    await getStoreSettings({
      StoreSettingsModel,
    });

  const value =
    serializeStoreSettings(settings);

  if (cache) {
    cacheStore.entry = {
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
  prepaidDiscount,
  StoreSettingsModel = StoreSettings,
} = {}) {
  const updates = {};

  if (acceptingOrders !== undefined) {
    updates.acceptingOrders =
      acceptingOrders !== false;
  }

  if (
    prepaidDiscount &&
    typeof prepaidDiscount === "object"
  ) {
    const normalizedPrepaidDiscount =
      serializePrepaidDiscountSettings(
        prepaidDiscount,
      );

    updates.prepaidDiscount =
      normalizedPrepaidDiscount;
  }

  const update = {
    $setOnInsert: {
      key: GLOBAL_STORE_SETTINGS_KEY,
      acceptingOrders: true,
      prepaidDiscount:
        DEFAULT_PREPAID_DISCOUNT,
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

  cacheStore.entry = {
    value:
      serializeStoreSettings(settings),

    expiresAt:
      Date.now() +
      STORE_SETTINGS_CACHE_TTL_MS,
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