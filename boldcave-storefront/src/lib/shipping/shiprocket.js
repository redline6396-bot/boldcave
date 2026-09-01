import crypto from "node:crypto";

import Order from "@/models/Order";
import ShiprocketAuthCache from "@/models/ShiprocketAuthCache";
import connectDB from "@/lib/db";
import { calculateShipmentWeightKg } from "@/lib/shipping/shipmentWeight";

const SHIPROCKET_BASE_URL = "https://apiv2.shiprocket.in/v1/external";
const GENERIC_SERVICEABILITY_WEIGHT_KG = 0.5;
const SHIPROCKET_AUTH_CACHE_PROVIDER = "shiprocket";
const SHIPROCKET_TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000;
const SHIPROCKET_TOKEN_EXPIRY_BUFFER_MS = 60_000;
const SHIPROCKET_AUTH_LOCK_TTL_MS = 30_000;
const SHIPROCKET_AUTH_LOCK_WAIT_MS = 5_000;
const SHIPROCKET_AUTH_LOCK_POLL_MS = 350;
const SHIPROCKET_AUTH_COOLDOWN_MS = 5 * 60 * 1000;
const SHIPROCKET_AUTH_LOCK_OWNER = `${process.pid || "node"}-${crypto.randomUUID()}`;

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

function sanitizeAuthMessage(message) {
  return String(message || "").slice(0, 180);
}

function getCredentialFingerprint() {
  return crypto
    .createHash("sha256")
    .update(`${process.env.SHIPROCKET_EMAIL || ""}\0${process.env.SHIPROCKET_PASSWORD || ""}`)
    .digest("hex");
}

function getTime(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function isFutureWithBuffer(value) {
  return getTime(value) > Date.now() + SHIPROCKET_TOKEN_EXPIRY_BUFFER_MS;
}

function isUsableMemoryToken(credentialFingerprint) {
  return (
    tokenCache.token &&
    tokenCache.credentialFingerprint === credentialFingerprint &&
    tokenCache.expiresAt > Date.now() + SHIPROCKET_TOKEN_EXPIRY_BUFFER_MS
  );
}

function isUsableSharedToken(cacheDoc, credentialFingerprint) {
  return (
    cacheDoc?.accessToken &&
    cacheDoc.credentialFingerprint === credentialFingerprint &&
    isFutureWithBuffer(cacheDoc.tokenExpiresAt)
  );
}

function isAuthCooldownActive(cacheDoc, credentialFingerprint) {
  return (
    cacheDoc?.credentialFingerprint === credentialFingerprint &&
    getTime(cacheDoc.authCooldownUntil) > Date.now()
  );
}

function shouldApplyAuthCooldown(status) {
  return [401, 403, 429].includes(Number(status));
}

function createAuthCooldownError(cacheDoc) {
  const error = new Error("Shiprocket authentication is temporarily paused after a recent failure");
  error.code = "SHIPROCKET_AUTH_COOLDOWN";
  error.status = cacheDoc?.lastAuthFailureStatus;
  return error;
}

function hydrateMemoryToken(accessToken, tokenExpiresAt, credentialFingerprint) {
  tokenCache = {
    token: accessToken,
    expiresAt: getTime(tokenExpiresAt),
    credentialFingerprint,
  };
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
  credentialFingerprint: "",
};

let authPromise = null;

async function getSharedAuthCache() {
  await connectDB();
  return ShiprocketAuthCache.findOne({
    provider: SHIPROCKET_AUTH_CACHE_PROVIDER,
  }).lean();
}

async function acquireRefreshLock() {
  const now = new Date();
  const lockUntil = new Date(Date.now() + SHIPROCKET_AUTH_LOCK_TTL_MS);
  const credentialFingerprint = getCredentialFingerprint();

  try {
    return await ShiprocketAuthCache.findOneAndUpdate(
      {
        provider: SHIPROCKET_AUTH_CACHE_PROVIDER,
        $and: [
          {
            $or: [
              { refreshLockUntil: { $exists: false } },
              { refreshLockUntil: null },
              { refreshLockUntil: { $lte: now } },
              { refreshLockOwner: SHIPROCKET_AUTH_LOCK_OWNER },
            ],
          },
          {
            $or: [
              { credentialFingerprint: { $ne: credentialFingerprint } },
              { authCooldownUntil: { $exists: false } },
              { authCooldownUntil: null },
              { authCooldownUntil: { $lte: now } },
            ],
          },
        ],
      },
      {
        $set: {
          provider: SHIPROCKET_AUTH_CACHE_PROVIDER,
          refreshLockUntil: lockUntil,
          refreshLockOwner: SHIPROCKET_AUTH_LOCK_OWNER,
        },
      },
      { upsert: true, returnDocument: "after" }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return null;
    }

    throw error;
  }
}

async function releaseRefreshLock() {
  await ShiprocketAuthCache.updateOne(
    {
      provider: SHIPROCKET_AUTH_CACHE_PROVIDER,
      refreshLockOwner: SHIPROCKET_AUTH_LOCK_OWNER,
    },
    {
      $unset: {
        refreshLockUntil: "",
        refreshLockOwner: "",
      },
    }
  );
}

async function saveSuccessfulAuth(accessToken, tokenExpiresAt, credentialFingerprint) {
  await ShiprocketAuthCache.findOneAndUpdate(
    { provider: SHIPROCKET_AUTH_CACHE_PROVIDER },
    {
      $set: {
        provider: SHIPROCKET_AUTH_CACHE_PROVIDER,
        accessToken,
        tokenExpiresAt,
        credentialFingerprint,
      },
      $unset: {
        refreshLockUntil: "",
        refreshLockOwner: "",
        authCooldownUntil: "",
        lastAuthFailureStatus: "",
        lastAuthFailureAt: "",
        lastAuthFailureMessage: "",
      },
    },
    { upsert: true, returnDocument: "after" }
  );
}

async function saveFailedAuth({ status, message, credentialFingerprint }) {
  const shouldCooldown = shouldApplyAuthCooldown(status);
  const update = {
    $set: {
      provider: SHIPROCKET_AUTH_CACHE_PROVIDER,
      credentialFingerprint,
      lastAuthFailureAt: new Date(),
      lastAuthFailureMessage: sanitizeAuthMessage(message),
    },
    $unset: {
      accessToken: "",
      tokenExpiresAt: "",
      refreshLockUntil: "",
      refreshLockOwner: "",
    },
  };

  if (status) {
    update.$set.lastAuthFailureStatus = status;
  } else {
    update.$unset.lastAuthFailureStatus = "";
  }

  if (shouldCooldown) {
    update.$set.authCooldownUntil = new Date(Date.now() + SHIPROCKET_AUTH_COOLDOWN_MS);
  } else {
    update.$unset.authCooldownUntil = "";
  }

  await ShiprocketAuthCache.findOneAndUpdate(
    { provider: SHIPROCKET_AUTH_CACHE_PROVIDER },
    update,
    { upsert: true, returnDocument: "after" }
  );
}

async function waitForSharedToken(credentialFingerprint) {
  const deadline = Date.now() + SHIPROCKET_AUTH_LOCK_WAIT_MS;

  while (Date.now() < deadline) {
    await delay(SHIPROCKET_AUTH_LOCK_POLL_MS);
    const cacheDoc = await getSharedAuthCache();

    if (isUsableSharedToken(cacheDoc, credentialFingerprint)) {
      hydrateMemoryToken(
        cacheDoc.accessToken,
        cacheDoc.tokenExpiresAt,
        credentialFingerprint
      );
      return cacheDoc.accessToken;
    }

    if (isAuthCooldownActive(cacheDoc, credentialFingerprint)) {
      throw createAuthCooldownError(cacheDoc);
    }
  }

  return "";
}

async function loginToShiprocket(credentialFingerprint) {
  let response;
  let data = {};

  try {
    response = await fetch(`${SHIPROCKET_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
      }),
    });
  } catch (error) {
    await saveFailedAuth({
      status: null,
      message: error?.message || "Network error",
      credentialFingerprint,
    });
    throw error;
  }

  data = await response.json().catch(() => ({}));

  if (!response.ok || !data.token) {
    const message = data?.message || data?.error || "Shiprocket authentication failed";
    await saveFailedAuth({
      status: response.status,
      message,
      credentialFingerprint,
    });
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const tokenExpiresAt = new Date(Date.now() + SHIPROCKET_TOKEN_TTL_MS);
  await saveSuccessfulAuth(data.token, tokenExpiresAt, credentialFingerprint);
  hydrateMemoryToken(data.token, tokenExpiresAt, credentialFingerprint);

  return data.token;
}

async function resolveShiprocketToken() {
  const credentialFingerprint = getCredentialFingerprint();

  await connectDB();

  const cacheDoc = await getSharedAuthCache();

  if (isUsableSharedToken(cacheDoc, credentialFingerprint)) {
    hydrateMemoryToken(cacheDoc.accessToken, cacheDoc.tokenExpiresAt, credentialFingerprint);
    return cacheDoc.accessToken;
  }

  if (isAuthCooldownActive(cacheDoc, credentialFingerprint)) {
    throw createAuthCooldownError(cacheDoc);
  }

  const lockDoc = await acquireRefreshLock();

  if (lockDoc?.refreshLockOwner === SHIPROCKET_AUTH_LOCK_OWNER) {
    try {
      return await loginToShiprocket(credentialFingerprint);
    } finally {
      await releaseRefreshLock().catch(() => {});
    }
  }

  const sharedToken = await waitForSharedToken(credentialFingerprint);
  if (sharedToken) return sharedToken;

  const recoveredLockDoc = await acquireRefreshLock();
  if (recoveredLockDoc?.refreshLockOwner === SHIPROCKET_AUTH_LOCK_OWNER) {
    try {
      return await loginToShiprocket(credentialFingerprint);
    } finally {
      await releaseRefreshLock().catch(() => {});
    }
  }

  const error = new Error("Shiprocket authentication is already in progress");
  error.code = "SHIPROCKET_AUTH_IN_PROGRESS";
  throw error;
}

export async function getShiprocketToken() {
  if (!hasShiprocketConfig()) {
    throw new Error("Shiprocket is not configured");
  }

  const credentialFingerprint = getCredentialFingerprint();

  if (isUsableMemoryToken(credentialFingerprint)) {
    return tokenCache.token;
  }

  if (authPromise) {
    return authPromise;
  }

  authPromise = resolveShiprocketToken();

  try {
    return await authPromise;
  } finally {
    authPromise = null;
  }
}

function normalizeServiceabilityWeight(weightKg) {
  const number = Number(weightKg);

  if (!Number.isFinite(number) || number <= 0) {
    throw new Error("Shiprocket serviceability weight is invalid");
  }

  return Number(number.toFixed(3));
}

export async function checkServiceability({
  deliveryPincode,
  cod = false,
  weightKg = GENERIC_SERVICEABILITY_WEIGHT_KG,
}) {
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
    weight: String(normalizeServiceabilityWeight(weightKg)),
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

export async function validateCheckoutServiceability({
  deliveryPincode,
  cod = false,
  items = [],
}) {
  try {
    const shipmentWeightKg = calculateShipmentWeightKg(items);

    if (shipmentWeightKg <= 0) {
      return {
        ok: false,
        code: "SHIPMENT_WEIGHT_MISSING",
        message:
          "Delivery availability could not be verified right now. Please retry.",
        status: 503,
        retryable: false,
      };
    }

    const result = await checkServiceability({
      deliveryPincode,
      cod,
      weightKg: shipmentWeightKg,
    });

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

export async function cancelShiprocketOrder(shiprocketOrderId) {
  const numericOrderId = Number(shiprocketOrderId);

  if (!Number.isInteger(numericOrderId) || numericOrderId <= 0) {
    const error = new Error("Shiprocket order ID is invalid");
    error.code = "SHIPROCKET_CANCEL_ID_INVALID";
    throw error;
  }

  return shiprocketFetch("/orders/cancel", {
    method: "POST",
    body: JSON.stringify({ ids: [numericOrderId] }),
  });
}

export async function cancelShiprocketShipmentByAwb(awbCode) {
  const awb = String(awbCode || "").trim();

  if (!awb) {
    const error = new Error("Shiprocket AWB is invalid");
    error.code = "SHIPROCKET_CANCEL_AWB_INVALID";
    throw error;
  }

  return shiprocketFetch("/orders/cancel/shipment/awbs", {
    method: "POST",
    body: JSON.stringify({ awbs: [awb] }),
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

  if (isShiprocketRtoStatus(status)) {
    return "";
  }

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

export function isShiprocketRtoStatus(rawStatus) {
  const status = String(rawStatus || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");

  return status.includes("rto") || status.includes("return to origin");
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
