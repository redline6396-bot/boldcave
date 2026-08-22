import StoreSettings from "@/models/StoreSettings";

const GLOBAL_STORE_SETTINGS_KEY = "global";

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
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
}

export async function getSerializedStoreSettings() {
  return serializeStoreSettings(await getStoreSettings());
}

export async function updateStoreSettings({ acceptingOrders }) {
  return StoreSettings.findOneAndUpdate(
    { key: GLOBAL_STORE_SETTINGS_KEY },
    {
      $set: {
        acceptingOrders: acceptingOrders !== false,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
}

export async function isAcceptingOrders() {
  const settings = await getStoreSettings();
  return settings.acceptingOrders !== false;
}
