import {
  SHADOWFAX_PROVIDER_ID,
  shadowfaxProvider,
} from "@/lib/shipping/providers/shadowfax";
import {
  SHIPROCKET_PROVIDER_ID,
  shiprocketProvider,
} from "@/lib/shipping/providers/shiprocket";
import {
  getOrderShippingSummary,
  hasShadowfaxOrderData,
} from "@/lib/shipping/summary";

export const SHIPPING_PROVIDERS = Object.freeze({
  SHIPROCKET: SHIPROCKET_PROVIDER_ID,
  SHADOWFAX: SHADOWFAX_PROVIDER_ID,
});

const PROVIDERS = Object.freeze({
  [SHIPROCKET_PROVIDER_ID]: shiprocketProvider,
  [SHADOWFAX_PROVIDER_ID]: shadowfaxProvider,
});

const DEFAULT_SHIPPING_PROVIDER = SHIPROCKET_PROVIDER_ID;

function normalizeProviderId(providerId) {
  return String(providerId || "").trim().toLowerCase();
}

function unsupportedProviderError(providerId) {
  const error = new Error(
    `Unsupported shipping provider "${providerId}". Supported providers: ${Object.keys(
      PROVIDERS
    ).join(", ")}.`
  );
  error.code = "SHIPPING_PROVIDER_UNSUPPORTED";
  error.status = 500;
  return error;
}

export function getConfiguredShippingProvider() {
  const providerId = normalizeProviderId(
    process.env.SHIPPING_PROVIDER || DEFAULT_SHIPPING_PROVIDER
  );

  if (!PROVIDERS[providerId]) {
    throw unsupportedProviderError(providerId || "(empty)");
  }

  return providerId;
}

export function getShippingProvider(providerId = getConfiguredShippingProvider()) {
  const normalizedProviderId = normalizeProviderId(providerId);
  const provider = PROVIDERS[normalizedProviderId];

  if (!provider) {
    throw unsupportedProviderError(normalizedProviderId || "(empty)");
  }

  return provider;
}

export function hasShiprocketOrderData(order) {
  const shiprocket = order?.shiprocket;

  return Boolean(
    shiprocket?.shiprocketOrderId ||
      shiprocket?.shipmentId ||
      shiprocket?.awbCode ||
      shiprocket?.courierName ||
      shiprocket?.trackingUrl ||
      shiprocket?.shipmentStatus ||
      shiprocket?.syncStatus ||
      shiprocket?.lastError ||
      shiprocket?.lastAttemptAt ||
      shiprocket?.lastSyncedAt ||
      shiprocket?.syncStartedAt
  );
}

export { getOrderShippingSummary };

export function getOrderShippingProvider(order) {
  const storedProvider = normalizeProviderId(order?.shippingProvider);

  if (storedProvider) {
    if (!PROVIDERS[storedProvider]) {
      throw unsupportedProviderError(storedProvider);
    }

    return storedProvider;
  }

  if (hasShadowfaxOrderData(order)) {
    return SHADOWFAX_PROVIDER_ID;
  }

  if (hasShiprocketOrderData(order)) {
    return SHIPROCKET_PROVIDER_ID;
  }

  return getConfiguredShippingProvider();
}

export function getShippingProviderLabel(providerId) {
  return getShippingProvider(providerId).label;
}

export function hasShipmentCancellationTarget(order) {
  return getShippingProvider(getOrderShippingProvider(order)).hasCancellationTarget(order);
}

export async function checkServiceability(options) {
  return getShippingProvider().checkServiceability(options);
}

export async function validateCheckoutServiceability(options) {
  return getShippingProvider().validateCheckoutServiceability(options);
}

export async function syncShipment(order) {
  return getShippingProvider(getOrderShippingProvider(order)).syncShipment(order);
}

export async function trackShipment(order) {
  return getShippingProvider(getOrderShippingProvider(order)).trackShipment(order);
}

export async function cancelShipment(order) {
  return getShippingProvider(getOrderShippingProvider(order)).cancelShipment(order);
}

export function mapShippingStatusToOrderStatus(order, rawStatus) {
  return getShippingProvider(getOrderShippingProvider(order)).mapStatusToOrderStatus(
    rawStatus,
    order
  );
}

export function applyShippingStatusToOrder(order, rawStatus) {
  return getShippingProvider(getOrderShippingProvider(order)).applyStatusToOrder(
    order,
    rawStatus
  );
}
