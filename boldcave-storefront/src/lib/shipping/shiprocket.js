import Order from "@/models/Order";

const SHIPROCKET_BASE_URL = "https://apiv2.shiprocket.in/v1/external";

const ORDER_STATUS_RANK = {
  confirmed: 0,
  processing: 1,
  shipped: 2,
  in_transit: 3,
  out_for_delivery: 4,
  delivered: 5,
};

function sanitizeShiprocketError(error) {
  return String(error?.message || "Shiprocket request failed").slice(0, 300);
}

function hasShiprocketConfig() {
  return Boolean(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD);
}

async function shiprocketFetch(path, options = {}) {
  if (!hasShiprocketConfig()) {
    const error = new Error("Shiprocket is not configured");
    error.code = "SHIPROCKET_NOT_CONFIGURED";
    throw error;
  }

  const token = await getShiprocketToken();
  const response = await fetch(`${SHIPROCKET_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data?.message || "Shiprocket request failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

let tokenCache = {
  token: "",
  expiresAt: 0,
};

export async function getShiprocketToken() {
  if (!hasShiprocketConfig()) {
    throw new Error("Shiprocket is not configured");
  }

  if (tokenCache.token && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }

  const response = await fetch(`${SHIPROCKET_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.token) {
    throw new Error(data?.message || "Shiprocket authentication failed");
  }

  tokenCache = {
    token: data.token,
    expiresAt: Date.now() + 9 * 24 * 60 * 60 * 1000,
  };

  return tokenCache.token;
}

export async function checkServiceability({ deliveryPincode, cod = false }) {
  if (!/^\d{6}$/.test(String(deliveryPincode || ""))) {
    return {
      serviceable: false,
      code: "INVALID_PINCODE",
      message: "Invalid pincode",
    };
  }

  const pickupPostcode = process.env.SHIPROCKET_PICKUP_PINCODE;
  if (!pickupPostcode) {
    throw new Error("SHIPROCKET_PICKUP_PINCODE is not configured");
  }

  const params = new URLSearchParams({
    pickup_postcode: pickupPostcode,
    delivery_postcode: deliveryPincode,
    cod: cod ? "1" : "0",
    weight: "0.5",
  });

  const data = await shiprocketFetch(`/courier/serviceability/?${params.toString()}`);
  const couriers = data?.data?.available_courier_companies || [];

  if (!couriers.length) {
    return {
      serviceable: false,
      code: "UNSERVICEABLE",
      message: "This pincode is valid but not serviceable right now",
    };
  }

  return {
    serviceable: true,
    code: "SERVICEABLE",
    couriers: couriers.slice(0, 5).map((courier) => ({
      courierName: courier.courier_name,
      rate: courier.rate,
      estimatedDeliveryDays: courier.estimated_delivery_days,
      cod: Boolean(courier.cod),
    })),
  };
}

export async function validateCheckoutServiceability({ deliveryPincode, cod = false }) {
  try {
    const result = await checkServiceability({ deliveryPincode, cod });

    if (!result.serviceable) {
      return {
        ok: false,
        code: result.code || "DELIVERY_UNSERVICEABLE",
        message:
          result.message ||
          "This delivery pincode is not serviceable right now.",
        status: 422,
        retryable: false,
      };
    }

    return { ok: true, result };
  } catch (error) {
    return {
      ok: false,
      code: "SERVICEABILITY_CHECK_FAILED",
      message:
        "Delivery availability could not be verified right now. Please retry.",
      status: 503,
      retryable: true,
      detail: sanitizeShiprocketError(error),
    };
  }
}

function getItemShippingIssues(item) {
  const missing = [];
  const isPositiveFinite = (value) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0;
  };

  if (!String(item?.sku || "").trim()) missing.push("SKU");
  if (!String(item?.hsnCode || "").trim()) missing.push("HSN Code");
  if (!isPositiveFinite(item?.weightKg)) missing.push("weight");
  if (!isPositiveFinite(item?.lengthCm)) missing.push("length");
  if (!isPositiveFinite(item?.breadthCm)) missing.push("breadth");
  if (!isPositiveFinite(item?.heightCm)) missing.push("height");

  return missing;
}

function assertShiprocketMetadata(order) {
  const issues = [];

  (order.items || []).forEach((item) => {
    const missing = getItemShippingIssues(item);
    if (!missing.length) return;

    issues.push(`${item.name || "Item"} ${item.size || ""}: ${missing.join(", ")}`);
  });

  if (issues.length) {
    const error = new Error(`Missing Shiprocket metadata: ${issues.join("; ")}`);
    error.code = "SHIPROCKET_METADATA_MISSING";
    throw error;
  }
}

function getPackageMetrics(items = []) {
  return items.reduce(
    (metrics, item) => {
      const quantity = Math.max(1, Number(item.quantity) || 1);

      return {
        weight: metrics.weight + Number(item.weightKg) * quantity,
        length: Math.max(metrics.length, Number(item.lengthCm) || 0),
        breadth: Math.max(metrics.breadth, Number(item.breadthCm) || 0),
        height: Math.max(metrics.height, Number(item.heightCm) || 0),
      };
    },
    { weight: 0, length: 0, breadth: 0, height: 0 }
  );
}

export async function createShiprocketOrder(order) {
  assertShiprocketMetadata(order);
  const packageMetrics = getPackageMetrics(order.items || []);

  const payload = {
    order_id: order.orderNumber,
    order_date: order.createdAt?.toISOString().slice(0, 10) || new Date().toISOString().slice(0, 10),
    pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",
    billing_customer_name: order.deliveryAddress.fullName,
    billing_last_name: "",
    billing_address: order.deliveryAddress.addressLine,
    billing_city: order.deliveryAddress.city,
    billing_pincode: order.deliveryAddress.pincode,
    billing_state: order.deliveryAddress.state,
    billing_country: "India",
    billing_email: order.customer.email || order.deliveryAddress.email || "customer@example.com",
    billing_phone: order.customer.phone,
    shipping_is_billing: true,
    order_items: order.items.map((item) => ({
      name: `${item.name} ${item.size}`,
      sku: item.sku,
      units: item.quantity,
      selling_price: item.unitPrice,
      hsn: item.hsnCode,
    })),
    payment_method: order.payment.method === "cod" ? "COD" : "Prepaid",
    sub_total: order.amounts.finalAmount,
    length: packageMetrics.length,
    breadth: packageMetrics.breadth,
    height: packageMetrics.height,
    weight: Number(packageMetrics.weight.toFixed(3)),
  };

  return shiprocketFetch("/orders/create/adhoc", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function getShiprocketCreationFields(shiprocketOrder) {
  return {
    shiprocketOrderId:
      shiprocketOrder.order_id ||
      shiprocketOrder.shiprocket_order_id ||
      shiprocketOrder.data?.order_id ||
      "",
    shipmentId:
      shiprocketOrder.shipment_id ||
      shiprocketOrder.data?.shipment_id ||
      "",
    awbCode:
      shiprocketOrder.awb_code ||
      shiprocketOrder.awb ||
      shiprocketOrder.data?.awb_code ||
      "",
    courierName:
      shiprocketOrder.courier_name ||
      shiprocketOrder.courier_company ||
      shiprocketOrder.data?.courier_name ||
      "",
    trackingUrl:
      shiprocketOrder.tracking_url ||
      shiprocketOrder.data?.tracking_url ||
      "",
    shipmentStatus:
      shiprocketOrder.status ||
      shiprocketOrder.shipment_status ||
      shiprocketOrder.data?.status ||
      "",
  };
}

function hasStoredShiprocketIdentity(order) {
  return Boolean(order?.shiprocket?.shiprocketOrderId || order?.shiprocket?.shipmentId);
}

export async function syncShiprocketOrder(order) {
  const orderId = order?._id;

  if (!orderId) {
    throw new Error("Order is required for Shiprocket sync");
  }

  if (hasStoredShiprocketIdentity(order)) {
    return { ok: true, skipped: true, order };
  }

  const claimedOrder = await Order.findOneAndUpdate(
    {
      _id: orderId,
      $and: [
        {
          $or: [
            { "shiprocket.shiprocketOrderId": { $exists: false } },
            { "shiprocket.shiprocketOrderId": null },
            { "shiprocket.shiprocketOrderId": "" },
          ],
        },
        {
          $or: [
            { "shiprocket.shipmentId": { $exists: false } },
            { "shiprocket.shipmentId": null },
            { "shiprocket.shipmentId": "" },
          ],
        },
      ],
      $or: [
        { "shiprocket.syncStatus": { $exists: false } },
        { "shiprocket.syncStatus": { $in: ["pending", "failed", "not_configured"] } },
      ],
    },
    {
      $set: {
        "shiprocket.syncStatus": "syncing",
        "shiprocket.lastError": "",
        "shiprocket.lastAttemptAt": new Date(),
        "shiprocket.syncStartedAt": new Date(),
      },
    },
    { returnDocument: "after" }
  );

  if (!claimedOrder) {
    const latestOrder = await Order.findById(orderId);
    return {
      ok: hasStoredShiprocketIdentity(latestOrder),
      skipped: hasStoredShiprocketIdentity(latestOrder),
      inProgress: latestOrder?.shiprocket?.syncStatus === "syncing",
      order: latestOrder || order,
    };
  }

  try {
    const shiprocketOrder = await createShiprocketOrder(claimedOrder);
    const fields = getShiprocketCreationFields(shiprocketOrder);
    const updatedOrder = await Order.findByIdAndUpdate(
      claimedOrder._id,
      {
        $set: {
          "shiprocket.shiprocketOrderId": fields.shiprocketOrderId,
          "shiprocket.shipmentId": fields.shipmentId,
          "shiprocket.awbCode": fields.awbCode,
          "shiprocket.courierName": fields.courierName,
          "shiprocket.trackingUrl": fields.trackingUrl,
          "shiprocket.shipmentStatus": fields.shipmentStatus,
          "shiprocket.syncStatus": "created",
          "shiprocket.lastError": "",
          "shiprocket.lastSyncedAt": new Date(),
        },
        $unset: {
          "shiprocket.syncStartedAt": "",
        },
      },
      { returnDocument: "after" }
    );

    return {
      ok: true,
      order: updatedOrder || claimedOrder,
      shiprocket: fields,
    };
  } catch (error) {
    const syncStatus =
      error.message?.includes("not configured") ||
      error.code === "SHIPROCKET_NOT_CONFIGURED"
        ? "not_configured"
        : "failed";
    const failedOrder = await Order.findByIdAndUpdate(
      claimedOrder._id,
      {
        $set: {
          "shiprocket.syncStatus": syncStatus,
          "shiprocket.lastError": sanitizeShiprocketError(error),
          "shiprocket.lastAttemptAt": new Date(),
        },
        $unset: {
          "shiprocket.syncStartedAt": "",
        },
      },
      { returnDocument: "after" }
    );

    return {
      ok: false,
      order: failedOrder || claimedOrder,
      error: sanitizeShiprocketError(error),
      syncStatus,
    };
  }
}

export function mapShiprocketStatusToOrderStatus(rawStatus) {
  const status = String(rawStatus || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");

  if (!status) return "";

  if (status.includes("delivered") && !status.includes("rto")) {
    return "delivered";
  }

  if (
    status.includes("out for delivery") ||
    status === "ofd" ||
    status.includes(" outfordelivery")
  ) {
    return "out_for_delivery";
  }

  if (
    status.includes("in transit") ||
    status.includes("intransit") ||
    status.includes("transit") ||
    status.includes("reached") ||
    status.includes("bagged")
  ) {
    return "in_transit";
  }

  if (
    status.includes("shipped") ||
    status.includes("dispatched") ||
    status.includes("picked up") ||
    status.includes("pickup done") ||
    status.includes("picked by") ||
    status.includes("handed over") ||
    status.includes("handed to courier") ||
    status.includes("handover")
  ) {
    return "shipped";
  }

  return "";
}

export function applyShiprocketStatusToOrder(order, rawStatus) {
  const mappedStatus = mapShiprocketStatusToOrderStatus(rawStatus);

  if (!mappedStatus || !order || order.orderStatus === "cancelled") {
    return false;
  }

  const currentRank = ORDER_STATUS_RANK[order.orderStatus] ?? 0;
  const nextRank = ORDER_STATUS_RANK[mappedStatus];

  if (nextRank === undefined || nextRank < currentRank) {
    return false;
  }

  order.orderStatus = mappedStatus;
  return true;
}

export function getStatusFromTracking(tracking) {
  return (
    tracking?.tracking_data?.shipment_track?.[0]?.current_status ||
    tracking?.tracking_data?.track_status ||
    tracking?.current_status ||
    ""
  );
}

export async function getTrackingByAwb(awbCode) {
  if (!awbCode) {
    return null;
  }

  return shiprocketFetch(`/courier/track/awb/${encodeURIComponent(awbCode)}`);
}
