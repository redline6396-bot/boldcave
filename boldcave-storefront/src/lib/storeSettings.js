import StoreSettings from "@/models/StoreSettings";

const GLOBAL_STORE_SETTINGS_KEY = "global";

function getEnvOtpMode() {
  return process.env.OTP_PROVIDER === "mock" &&
    process.env.OTP_MOCK_ENABLED === "true"
    ? "test"
    : "live";
}

export function serializeStoreSettings(settings) {
  return {
    acceptingOrders: settings?.acceptingOrders !== false,
    updatedAt: settings?.updatedAt || null,
  };
}

export async function getStoreSettings() {
  return StoreSettings.findOneAndUpdate(
    { key: GLOBAL_STORE_SETTINGS_KEY },
    {
      $setOnInsert: {
        key: GLOBAL_STORE_SETTINGS_KEY,
        acceptingOrders: true,
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
}

export async function getSerializedStoreSettings() {
  return serializeStoreSettings(await getStoreSettings());
}

export async function updateStoreSettings({ acceptingOrders } = {}) {
  const updates = {};

  if (acceptingOrders !== undefined) {
    updates.acceptingOrders = acceptingOrders !== false;
  }

  const update = {
    $setOnInsert: {
      key: GLOBAL_STORE_SETTINGS_KEY,
      acceptingOrders: true,
    },
  };

  if (Object.keys(updates).length) {
    update.$set = updates;
  }

  return StoreSettings.findOneAndUpdate(
    { key: GLOBAL_STORE_SETTINGS_KEY },
    update,
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
}

export async function isAcceptingOrders() {
  const settings = await getStoreSettings();
  return settings.acceptingOrders !== false;
}

export async function getOtpMode() {
  return getEnvOtpMode();
}
