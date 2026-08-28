import StoreSettings from "@/models/StoreSettings";

const GLOBAL_STORE_SETTINGS_KEY = "global";
const DEFAULT_PREPAID_DISCOUNT = {
  enabled: true,
  discountType: "percentage",
  discountValue: 10,
  allowCouponStacking: true,
};

function getEnvOtpMode() {
  return process.env.OTP_PROVIDER === "mock" &&
    process.env.OTP_MOCK_ENABLED === "true"
    ? "test"
    : "live";
}

export function serializeStoreSettings(settings) {
  return {
    acceptingOrders: settings?.acceptingOrders !== false,
    prepaidDiscount: serializePrepaidDiscountSettings(settings?.prepaidDiscount),
    updatedAt: settings?.updatedAt || null,
  };
}

export function serializePrepaidDiscountSettings(prepaidDiscount = {}) {
  const discountType =
    prepaidDiscount?.discountType === "fixed" ? "fixed" : "percentage";
  const rawValue = Number(prepaidDiscount?.discountValue);
  const discountValue = Number.isFinite(rawValue) && rawValue > 0 ? rawValue : 0;

  return {
    enabled: prepaidDiscount?.enabled !== false,
    discountType,
    discountValue:
      discountType === "percentage"
        ? Math.min(100, discountValue)
        : discountValue,
    allowCouponStacking: prepaidDiscount?.allowCouponStacking !== false,
  };
}

export async function getStoreSettings() {
  return StoreSettings.findOneAndUpdate(
    { key: GLOBAL_STORE_SETTINGS_KEY },
    {
      $setOnInsert: {
        key: GLOBAL_STORE_SETTINGS_KEY,
        acceptingOrders: true,
        prepaidDiscount: DEFAULT_PREPAID_DISCOUNT,
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

export async function updateStoreSettings({
  acceptingOrders,
  prepaidDiscount,
} = {}) {
  const updates = {};

  if (acceptingOrders !== undefined) {
    updates.acceptingOrders = acceptingOrders !== false;
  }

  if (prepaidDiscount && typeof prepaidDiscount === "object") {
    const normalizedPrepaidDiscount =
      serializePrepaidDiscountSettings(prepaidDiscount);
    updates.prepaidDiscount = normalizedPrepaidDiscount;
  }

  const update = {
    $setOnInsert: {
      key: GLOBAL_STORE_SETTINGS_KEY,
      acceptingOrders: true,
      prepaidDiscount: DEFAULT_PREPAID_DISCOUNT,
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
