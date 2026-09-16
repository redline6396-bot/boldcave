export const SHIPROCKET_PROVIDER_ID = "shiprocket";
export const SHADOWFAX_PROVIDER_ID = "shadowfax";
export const DELHIVERY_PROVIDER_ID = "delhivery";

function cleanProviderId(providerId) {
  return String(providerId || "").trim().toLowerCase();
}

function getDelhiveryTrackingUrl(waybill) {
  const value = String(waybill || "").trim();
  return value
    ? `https://www.delhivery.com/track/package/${encodeURIComponent(value)}`
    : "";
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

export function hasDelhiveryOrderData(order) {
  const delhivery = order?.delhivery;

  return Boolean(
    delhivery?.waybill ||
      delhivery?.referenceNo ||
      delhivery?.trackingUrl ||
      delhivery?.shipmentStatus ||
      delhivery?.statusDisplay ||
      delhivery?.syncStatus ||
      delhivery?.lastError ||
      delhivery?.lastAttemptAt ||
      delhivery?.lastSyncedAt ||
      delhivery?.syncStartedAt
  );
}

export function getOrderShippingSummary(order) {
  const storedProvider = cleanProviderId(order?.shippingProvider);
  const useShadowfax =
    storedProvider === SHADOWFAX_PROVIDER_ID ||
    (!storedProvider && hasShadowfaxOrderData(order));
  const useDelhivery =
    storedProvider === DELHIVERY_PROVIDER_ID ||
    (!storedProvider && hasDelhiveryOrderData(order));

  if (useDelhivery) {
    const delhivery = order?.delhivery || {};
    const cancelled =
      order?.orderStatus === "cancelled" &&
      (delhivery.cancelStatus === "cancelled" ||
        order?.cancellation?.status === "cancelled");
    const shipmentStatus = cancelled
      ? "Cancelled"
      : delhivery.statusDisplay || delhivery.shipmentStatus || "";
    return {
      provider: DELHIVERY_PROVIDER_ID,
      providerLabel: "Delhivery",
      providerOrderId: delhivery.referenceNo || "",
      awbCode: delhivery.waybill || "",
      trackingUrl:
        delhivery.trackingUrl || getDelhiveryTrackingUrl(delhivery.waybill),
      courierName: "Delhivery",
      shipmentStatus,
      statusDisplay: shipmentStatus,
      syncStatus: delhivery.syncStatus || "",
      lastError: delhivery.lastError || "",
      lastAttemptAt: delhivery.lastAttemptAt || null,
      lastSyncedAt: delhivery.lastSyncedAt || null,
    };
  }

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
