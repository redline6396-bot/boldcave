import StoreSettings from "@/models/StoreSettings";

const GLOBAL_STORE_SETTINGS_KEY = "global";
const OTP_MODES = ["test", "live"];

function normalizeOtpMode(value) {
  return OTP_MODES.includes(value) ? value : "live";
}

export function serializeStoreSettings(settings, { includeOtpMode = false } = {}) {
  const serialized = {
    acceptingOrders: settings?.acceptingOrders !== false,
    updatedAt: settings?.updatedAt || null,
  };

  if (includeOtpMode) {
    serialized.otpMode = normalizeOtpMode(settings?.otpMode);
  }

  return serialized;
}

export async function getStoreSettings() {
  return StoreSettings.findOneAndUpdate(
    { key: GLOBAL_STORE_SETTINGS_KEY },
    {
      $setOnInsert: {
        key: GLOBAL_STORE_SETTINGS_KEY,
        acceptingOrders: true,
        otpMode: "live",
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
}

export async function getSerializedStoreSettings(options = {}) {
  return serializeStoreSettings(await getStoreSettings(), options);
}

export async function updateStoreSettings({ acceptingOrders, otpMode } = {}) {
  const updates = {};

  if (acceptingOrders !== undefined) {
    updates.acceptingOrders = acceptingOrders !== false;
  }

  if (otpMode !== undefined) {
    updates.otpMode = normalizeOtpMode(otpMode);
  }

  const update = {
    $setOnInsert: {
      key: GLOBAL_STORE_SETTINGS_KEY,
      acceptingOrders: true,
      otpMode: "live",
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
  const settings = await getStoreSettings();
  return normalizeOtpMode(settings?.otpMode);
}
