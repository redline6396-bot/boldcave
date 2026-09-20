import StoreSettings from "@/models/StoreSettings";

const GLOBAL_STORE_SETTINGS_KEY = "global";

const STORE_SETTINGS_CACHE_TTL_MS =
  60 * 1000;

const DEFAULT_COD_CHARGE = {
  enabled: false,
  chargeType: "fixed",
  chargeValue: 0,
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

    comingSoonMode:
      settings?.comingSoonMode === true,

    codCharge:
      serializeCodChargeSettings(
        settings?.codCharge,
      ),

    updatedAt:
      settings?.updatedAt || null,
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
  comingSoonMode,
  codCharge,
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
