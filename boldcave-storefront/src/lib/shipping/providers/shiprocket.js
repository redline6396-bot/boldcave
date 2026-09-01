import {
  applyShiprocketStatusToOrder,
  cancelShiprocketOrder,
  cancelShiprocketShipmentByAwb,
  checkServiceability,
  getStatusFromTracking,
  getTrackingByAwb,
  mapShiprocketStatusToOrderStatus,
  syncShiprocketOrder,
  validateCheckoutServiceability,
} from "@/lib/shipping/shiprocket";

export const SHIPROCKET_PROVIDER_ID = "shiprocket";

function hasCancellationTarget(order) {
  return Boolean(order?.shiprocket?.awbCode || order?.shiprocket?.shiprocketOrderId);
}

async function trackShipment(order) {
  if (!order?.shiprocket?.awbCode) {
    return {
      available: false,
      orderId: order?._id ? String(order._id) : "",
      orderNumber: order?.orderNumber,
      status: order?.shiprocket?.shipmentStatus || order?.orderStatus,
    };
  }

  const tracking = await getTrackingByAwb(order.shiprocket.awbCode);
  const status = getStatusFromTracking(tracking) || order.shiprocket.shipmentStatus;

  order.shiprocket.shipmentStatus = status;
  order.shiprocket.lastSyncedAt = new Date();
  applyShiprocketStatusToOrder(order, status);
  await order.save();

  return {
    available: true,
    awbCode: order.shiprocket.awbCode,
    trackingUrl: order.shiprocket.trackingUrl,
    status: order.shiprocket.shipmentStatus,
    orderStatus: order.orderStatus,
    tracking,
  };
}

async function cancelShipment(order) {
  const awbCode = String(order?.shiprocket?.awbCode || "").trim();
  const shiprocketOrderId = order?.shiprocket?.shiprocketOrderId;

  if (!awbCode && !shiprocketOrderId) {
    return {
      provider: SHIPROCKET_PROVIDER_ID,
      skipped: true,
      cancelStatus: "not_required",
    };
  }

  if (awbCode) {
    await cancelShiprocketShipmentByAwb(awbCode);
  } else {
    await cancelShiprocketOrder(shiprocketOrderId);
  }

  return {
    provider: SHIPROCKET_PROVIDER_ID,
    skipped: false,
    cancelStatus: "cancelled",
  };
}

export const shiprocketProvider = {
  id: SHIPROCKET_PROVIDER_ID,
  label: "Shiprocket",
  checkServiceability,
  validateCheckoutServiceability,
  syncShipment: syncShiprocketOrder,
  trackShipment,
  cancelShipment,
  hasCancellationTarget,
  mapStatusToOrderStatus: mapShiprocketStatusToOrderStatus,
  applyStatusToOrder: applyShiprocketStatusToOrder,
};
