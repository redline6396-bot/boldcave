export const SHIPROCKET_PROVIDER_ID = "shiprocket";
export const SHADOWFAX_PROVIDER_ID = "shadowfax";

function cleanProviderId(providerId) {
  return String(providerId || "").trim().toLowerCase();
}

export function hasShadowfaxOrderData(order) {
  const shadowfax = order?.shadowfax;

  return Boolean(
    shadowfax?.orderId ||
      shadowfax?.awbNumber ||
      shadowfax?.clientOrderId ||
      shadowfax?.trackingUrl ||
      shadowfax?.shipmentStatus ||
      shadowfax?.statusDisplay ||
      shadowfax?.syncStatus ||
      shadowfax?.lastError ||
      shadowfax?.lastAttemptAt ||
      shadowfax?.lastSyncedAt ||
      shadowfax?.syncStartedAt
  );
}

export function getOrderShippingSummary(order) {
  const storedProvider = cleanProviderId(order?.shippingProvider);
  const useShadowfax =
    storedProvider === SHADOWFAX_PROVIDER_ID ||
    (!storedProvider && hasShadowfaxOrderData(order));

  if (useShadowfax) {
    const shadowfax = order?.shadowfax || {};
    return {
      provider: SHADOWFAX_PROVIDER_ID,
      providerLabel: "Shadowfax",
      awbCode: shadowfax.awbNumber || "",
      trackingUrl: shadowfax.trackingUrl || "",
      courierName: "Shadowfax",
      shipmentStatus: shadowfax.shipmentStatus || "",
      statusDisplay: shadowfax.statusDisplay || "",
      syncStatus: shadowfax.syncStatus || "",
    };
  }

  const shiprocket = order?.shiprocket || {};
  return {
    provider: SHIPROCKET_PROVIDER_ID,
    providerLabel: "Shiprocket",
    providerOrderId: shiprocket.shiprocketOrderId || "",
    shipmentId: shiprocket.shipmentId || "",
    awbCode: shiprocket.awbCode || "",
    trackingUrl: shiprocket.trackingUrl || "",
    courierName: shiprocket.courierName || "",
    shipmentStatus: shiprocket.shipmentStatus || "",
    statusDisplay: shiprocket.shipmentStatus || "",
    syncStatus: shiprocket.syncStatus || "",
  };
}
