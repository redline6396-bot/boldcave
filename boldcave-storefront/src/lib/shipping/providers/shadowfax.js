import Order from "@/models/Order";
import { calculateShipmentWeightKg } from "@/lib/shipping/shipmentWeight";

export const SHADOWFAX_PROVIDER_ID = "shadowfax";

const BASE_URLS = Object.freeze({
  staging: "https://dale.staging.shadowfax.in/api",
  production: "https://dale.shadowfax.in/api",
});

const DEFAULT_SERVICEABILITY_CACHE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_TRACKING_CACHE_TTL_MS = 60 * 1000;
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000;
const SERVICEABILITY_SERVICE = "customer_delivery";
const SAFE_DIAGNOSTIC_FIELDS = new Set([
  "responseCode",
  "code",
  "responseMsg",
  "message",
  "errors",
  "error",
  "detail",
]);

const serviceabilityCache = new Map();
const serviceabilityInFlight = new Map();
const trackingCache = new Map();
const trackingInFlight = new Map();

let cooldownUntil = 0;
let cooldownReasonCode = "";

function createShadowfaxError(code, message, status = 503, details = undefined) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  if (details) error.details = details;
  return error;
}

function cleanString(value) {
  return String(value || "").trim();
}

function isApiEnabled() {
  return cleanString(process.env.SHADOWFAX_API_ENABLED).toLowerCase() === "true";
}

function assertApiEnabled() {
  if (!isApiEnabled()) {
    throw createShadowfaxError(
      "SHADOWFAX_API_DISABLED",
      "Shadowfax API is disabled.",
      503
    );
  }
}

function parsePositiveMs(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function sanitizeShadowfaxError(error) {
  return cleanString(
    error?.details?.providerMessage || error?.message || "Shadowfax request failed"
  ).slice(0, 300);
}

function getShadowfaxEnv() {
  const env = cleanString(process.env.SHADOWFAX_ENV || "production").toLowerCase();
  if (!BASE_URLS[env]) {
    throw createShadowfaxError(
      "SHADOWFAX_ENV_INVALID",
      "Shadowfax environment is invalid.",
      500
    );
  }
  return env;
}

function getBaseUrl() {
  const override = cleanString(process.env.SHADOWFAX_BASE_URL);
  const baseUrl = override || BASE_URLS[getShadowfaxEnv()];
  return baseUrl.replace(/\/+$/, "");
}

function getApiToken() {
  const token = cleanString(process.env.SHADOWFAX_API_TOKEN);
  if (!token) {
    throw createShadowfaxError(
      "SHADOWFAX_TOKEN_REQUIRED",
      "Shadowfax API token is not configured.",
      500
    );
  }
  return token;
}

function parseRetryAfterMs(response) {
  const retryAfter = cleanString(response?.headers?.get?.("retry-after"));
  if (!retryAfter) return DEFAULT_COOLDOWN_MS;

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.ceil(seconds * 1000);
  }

  const retryAt = Date.parse(retryAfter);
  if (Number.isFinite(retryAt)) {
    return Math.max(retryAt - Date.now(), DEFAULT_COOLDOWN_MS);
  }

  return DEFAULT_COOLDOWN_MS;
}

function activateCooldown(response, code) {
  const cooldownMs =
    response?.status === 429 ? parseRetryAfterMs(response) : DEFAULT_COOLDOWN_MS;
  cooldownUntil = Date.now() + cooldownMs;
  cooldownReasonCode = code;
}

function assertNotInCooldown() {
  if (Date.now() < cooldownUntil) {
    throw createShadowfaxError(
      "SHADOWFAX_COOLDOWN",
      "Shadowfax requests are temporarily paused.",
      503,
      { retryAfterMs: cooldownUntil - Date.now(), reasonCode: cooldownReasonCode }
    );
  }
}

async function parseJsonSafely(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 300) };
  }
}

function sanitizeDiagnosticValue(value) {
  return cleanString(value)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b(?:\+?91[-\s]?)?[6-9]\d{9}\b/g, "[redacted-phone]")
    .replace(/\b\d{12,}\b/g, "[redacted-number]")
    .replace(/\s+/g, " ")
    .slice(0, 160);
}

function appendDiagnosticField(fields, key, value) {
  const sanitized = sanitizeDiagnosticValue(value);
  if (!sanitized) return;

  if (fields[key]) {
    if (!fields[key].split(" | ").includes(sanitized)) {
      fields[key] = `${fields[key]} | ${sanitized}`;
    }
    return;
  }

  fields[key] = sanitized;
}

function collectProviderDiagnostics(value, fields, depth = 0) {
  if (!value || depth > 3) return;

  if (Array.isArray(value)) {
    value.slice(0, 5).forEach((entry) =>
      collectProviderDiagnostics(entry, fields, depth + 1)
    );
    return;
  }

  if (typeof value !== "object") return;

  Object.entries(value).forEach(([key, entryValue]) => {
    if (SAFE_DIAGNOSTIC_FIELDS.has(key) && entryValue !== null) {
      if (typeof entryValue === "object") {
        collectProviderDiagnostics(entryValue, fields, depth + 1);
      } else {
        appendDiagnosticField(fields, key, entryValue);
      }
      return;
    }

    if (entryValue && typeof entryValue === "object") {
      collectProviderDiagnostics(entryValue, fields, depth + 1);
    }
  });
}

function getProviderMessage(payload, httpStatus) {
  const fields = {};
  if (Number.isFinite(Number(httpStatus))) {
    fields.httpStatus = String(httpStatus);
  }

  collectProviderDiagnostics(payload, fields);

  return Object.entries(fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ")
    .slice(0, 300);
}

async function shadowfaxRequest(path, { method = "GET", body } = {}) {
  assertApiEnabled();
  assertNotInCooldown();

  const headers = {
    Accept: "application/json",
    Authorization: `Token ${getApiToken()}`,
  };
  const options = { method, headers };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${getBaseUrl()}${path}`, options);
  } catch (error) {
    const shadowfaxError = createShadowfaxError(
      "SHADOWFAX_NETWORK_ERROR",
      "Shadowfax request failed before a response was received.",
      503
    );
    shadowfaxError.requestMayHaveReachedProvider = method !== "GET";
    shadowfaxError.cause = error;
    throw shadowfaxError;
  }

  const payload = await parseJsonSafely(response);

  if (response.status === 401 || response.status === 403) {
    activateCooldown(response, "SHADOWFAX_AUTH_FAILED");
    throw createShadowfaxError(
      "SHADOWFAX_AUTH_FAILED",
      "Shadowfax authentication failed.",
      response.status,
      { providerMessage: getProviderMessage(payload, response.status) }
    );
  }

  if (response.status === 429) {
    activateCooldown(response, "SHADOWFAX_RATE_LIMITED");
    throw createShadowfaxError(
      "SHADOWFAX_RATE_LIMITED",
      "Shadowfax rate limit reached.",
      429,
      { providerMessage: getProviderMessage(payload, response.status) }
    );
  }

  if (!response.ok) {
    throw createShadowfaxError(
      "SHADOWFAX_REQUEST_FAILED",
      "Shadowfax request failed.",
      response.status,
      { providerMessage: getProviderMessage(payload, response.status) }
    );
  }

  return payload;
}

function getCached(map, key, ttlMs) {
  const cached = map.get(key);
  if (!cached || Date.now() - cached.createdAt > ttlMs) {
    if (cached) map.delete(key);
    return null;
  }
  return cached.value;
}

function setCached(map, key, value) {
  map.set(key, { createdAt: Date.now(), value });
  return value;
}

function findPincodeEntry(payload, pincode) {
  if (!payload || typeof payload !== "object") return null;
  if (Array.isArray(payload)) {
    for (const entry of payload) {
      const match = findPincodeEntry(entry, pincode);
      if (match) return match;
    }
    return null;
  }

  if (cleanString(payload.code) === pincode && Array.isArray(payload.services)) {
    return payload;
  }

  for (const value of Object.values(payload)) {
    const match = findPincodeEntry(value, pincode);
    if (match) return match;
  }

  return null;
}

export async function checkServiceability({ deliveryPincode }) {
  const pincode = cleanString(deliveryPincode);
  if (!/^\d{6}$/.test(pincode)) {
    throw createShadowfaxError("INVALID_PINCODE", "Invalid pincode", 400);
  }

  const cacheKey = `${SERVICEABILITY_SERVICE}:${pincode}`;
  const ttlMs = parsePositiveMs(
    process.env.SHADOWFAX_SERVICEABILITY_CACHE_TTL_MS,
    DEFAULT_SERVICEABILITY_CACHE_TTL_MS
  );
  const cached = getCached(serviceabilityCache, cacheKey, ttlMs);
  if (cached) return cached;

  if (serviceabilityInFlight.has(cacheKey)) {
    return serviceabilityInFlight.get(cacheKey);
  }

  const request = (async () => {
    const params = new URLSearchParams({
      service: SERVICEABILITY_SERVICE,
      page: "1",
      count: "1",
      pincodes: pincode,
    });

    const payload = await shadowfaxRequest(
      `/v1/clients/serviceability/?${params.toString()}`
    );
    const entry = findPincodeEntry(payload, pincode);
    const services = Array.isArray(entry?.services) ? entry.services : [];
    const result = {
      provider: SHADOWFAX_PROVIDER_ID,
      serviceable: Boolean(entry && services.length),
      code: entry && services.length ? "SERVICEABLE" : "UNSERVICEABLE",
      message:
        entry && services.length
          ? "Delivery is available for this pincode."
          : "This delivery pincode is not serviceable right now.",
      services,
    };

    return setCached(serviceabilityCache, cacheKey, result);
  })();

  serviceabilityInFlight.set(cacheKey, request);
  try {
    return await request;
  } finally {
    serviceabilityInFlight.delete(cacheKey);
  }
}

export async function validateCheckoutServiceability({
  deliveryPincode,
  cod = false,
}) {
  try {
    const result = await checkServiceability({ deliveryPincode, cod });
    if (!result.serviceable) {
      return {
        ok: false,
        code: result.code || "DELIVERY_UNSERVICEABLE",
        message:
          result.message || "This delivery pincode is not serviceable right now.",
        status: 422,
        retryable: false,
      };
    }

    return { ok: true, result };
  } catch (error) {
    return {
      ok: false,
      code: error?.code || "SHADOWFAX_SERVICEABILITY_FAILED",
      message:
        "Delivery availability could not be verified right now. Please retry.",
      status: error?.status || 503,
      retryable: ![
        "SHADOWFAX_API_DISABLED",
        "SHADOWFAX_TOKEN_REQUIRED",
        "SHADOWFAX_AUTH_FAILED",
        "SHADOWFAX_COOLDOWN",
      ].includes(error?.code),
      detail: sanitizeShadowfaxError(error),
    };
  }
}

function requireValue(value, code, message) {
  const cleaned = cleanString(value);
  if (!cleaned) throw createShadowfaxError(code, message, 500);
  return cleaned;
}

function optionalValue(value) {
  const cleaned = cleanString(value);
  return cleaned || undefined;
}

function requirePincodeNumber(value, code, message) {
  const pincode = requireValue(value, code, message);
  if (!/^\d{6}$/.test(pincode)) {
    throw createShadowfaxError(code, message, 500);
  }

  return Number(pincode);
}

function optionalHsnCode(value) {
  const hsn = cleanString(value);

  // Only send standard 4 / 6 / 8 digit HSN codes.
  // Invalid/placeholder-looking values are omitted instead of being sent
  // to the shipping provider.
  if (!/^(?:\d{4}|\d{6}|\d{8})$/.test(hsn)) {
    return undefined;
  }

  return hsn;
}

function getPickupDetails() {
  const pickup = {
    name: optionalValue(process.env.SHADOWFAX_PICKUP_NAME),
    contact: requireValue(
      process.env.SHADOWFAX_PICKUP_CONTACT,
      "SHADOWFAX_PICKUP_CONFIG_REQUIRED",
      "Shadowfax pickup contact is required."
    ),
    address_line_1: requireValue(
      process.env.SHADOWFAX_PICKUP_ADDRESS_LINE_1,
      "SHADOWFAX_PICKUP_CONFIG_REQUIRED",
      "Shadowfax pickup address is required."
    ),
    address_line_2: optionalValue(process.env.SHADOWFAX_PICKUP_ADDRESS_LINE_2),
    city: requireValue(
      process.env.SHADOWFAX_PICKUP_CITY,
      "SHADOWFAX_PICKUP_CONFIG_REQUIRED",
      "Shadowfax pickup city is required."
    ),
    state: requireValue(
      process.env.SHADOWFAX_PICKUP_STATE,
      "SHADOWFAX_PICKUP_CONFIG_REQUIRED",
      "Shadowfax pickup state is required."
    ),
    pincode: requirePincodeNumber(
      process.env.SHADOWFAX_PICKUP_PINCODE,
      "SHADOWFAX_PICKUP_CONFIG_REQUIRED",
      "Shadowfax pickup pincode is required."
    ),
    latitude: optionalValue(process.env.SHADOWFAX_PICKUP_LATITUDE),
    longitude: optionalValue(process.env.SHADOWFAX_PICKUP_LONGITUDE),
    unique_code: optionalValue(process.env.SHADOWFAX_PICKUP_UNIQUE_CODE),
  };

  return removeUndefined(pickup);
}

function hasAnyRtoConfig() {
  return [
    "SHADOWFAX_RTO_NAME",
    "SHADOWFAX_RTO_CONTACT",
    "SHADOWFAX_RTO_ADDRESS_LINE_1",
    "SHADOWFAX_RTO_ADDRESS_LINE_2",
    "SHADOWFAX_RTO_CITY",
    "SHADOWFAX_RTO_STATE",
    "SHADOWFAX_RTO_PINCODE",
  ].some((key) => cleanString(process.env[key]));
}

function getRtoDetails(pickup) {
  if (!hasAnyRtoConfig()) {
    return removeUndefined({
      name: requireValue(
        pickup.name,
        "SHADOWFAX_RTO_CONFIG_REQUIRED",
        "Shadowfax RTO name is required."
      ),
      contact: pickup.contact,
      address_line_1: pickup.address_line_1,
      address_line_2: pickup.address_line_2,
      city: pickup.city,
      state: pickup.state,
      pincode: pickup.pincode,
    });
  }

  return removeUndefined({
    name: requireValue(
      process.env.SHADOWFAX_RTO_NAME,
      "SHADOWFAX_RTO_CONFIG_REQUIRED",
      "Shadowfax RTO name is required."
    ),
    contact: requireValue(
      process.env.SHADOWFAX_RTO_CONTACT,
      "SHADOWFAX_RTO_CONFIG_REQUIRED",
      "Shadowfax RTO contact is required."
    ),
    address_line_1: requireValue(
      process.env.SHADOWFAX_RTO_ADDRESS_LINE_1,
      "SHADOWFAX_RTO_CONFIG_REQUIRED",
      "Shadowfax RTO address is required."
    ),
    address_line_2: optionalValue(process.env.SHADOWFAX_RTO_ADDRESS_LINE_2),
    city: requireValue(
      process.env.SHADOWFAX_RTO_CITY,
      "SHADOWFAX_RTO_CONFIG_REQUIRED",
      "Shadowfax RTO city is required."
    ),
    state: requireValue(
      process.env.SHADOWFAX_RTO_STATE,
      "SHADOWFAX_RTO_CONFIG_REQUIRED",
      "Shadowfax RTO state is required."
    ),
    pincode: requirePincodeNumber(
      process.env.SHADOWFAX_RTO_PINCODE,
      "SHADOWFAX_RTO_CONFIG_REQUIRED",
      "Shadowfax RTO pincode is required."
    ),
  });
}

function removeUndefined(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  );
}

function getPaymentFields(order) {
  const method = cleanString(order?.payment?.method).toLowerCase();
  const paymentStatus = cleanString(order?.payment?.paymentStatus).toLowerCase();
  const finalAmount = Number(order?.amounts?.finalAmount);
  const productValue = calculateProductValue(order);

  if (!Number.isFinite(finalAmount) || finalAmount < 0) {
    throw createShadowfaxError(
      "SHADOWFAX_ORDER_AMOUNT_INVALID",
      "Order amount is invalid.",
      409
    );
  }

  if (method === "cod") {
    return {
      payment_mode: "COD",
      cod_amount: finalAmount,
      product_value: productValue,
    };
  }

  if (method === "razorpay" && paymentStatus === "paid") {
    return {
      payment_mode: "Prepaid",
      cod_amount: 0,
      product_value: productValue,
    };
  }

  throw createShadowfaxError(
    "SHADOWFAX_PAYMENT_STATE_INVALID",
    "Order payment state is not ready for Shadowfax shipment.",
    409
  );
}

function calculateProductValue(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const productValue = items.reduce((total, item) => {
    const quantity = Number(item?.quantity);
    const price = Number(item?.unitPrice);

    if (!Number.isFinite(quantity) || quantity <= 0) return total;
    if (!Number.isFinite(price) || price < 0) return total;

    return total + price * quantity;
  }, 0);

  if (!Number.isFinite(productValue) || productValue <= 0) {
    throw createShadowfaxError(
      "SHADOWFAX_ORDER_AMOUNT_INVALID",
      "Order product value is invalid.",
      409
    );
  }

  return Number(productValue.toFixed(2));
}

function getShadowfaxWeightFields(order) {
  const confirmedUnit = cleanString(
    process.env.SHADOWFAX_WEIGHT_UNIT_CONFIRMED
  ).toLowerCase();
  if (confirmedUnit !== "kg") {
    throw createShadowfaxError(
      "SHADOWFAX_WEIGHT_CONFIG_REQUIRED",
      "Shadowfax weight unit must be explicitly confirmed before creating shipments.",
      500
    );
  }

  const actualWeight = calculateShipmentWeightKg(order?.items || []);
  if (!Number.isFinite(actualWeight) || actualWeight <= 0) {
    throw createShadowfaxError(
      "SHADOWFAX_WEIGHT_CONFIG_REQUIRED",
      "Order weight is required before creating a Shadowfax shipment.",
      409
    );
  }

  return { actual_weight: Number((actualWeight * 1000).toFixed(3)) };
}

function getCustomerDetails(order) {
  const address = order?.deliveryAddress || {};
  const customer = order?.customer || {};
  return {
    name: requireValue(
      address.fullName,
      "SHADOWFAX_CUSTOMER_DETAILS_REQUIRED",
      "Customer name is required for Shadowfax shipment."
    ),
    contact: requireValue(
      customer.phone,
      "SHADOWFAX_CUSTOMER_DETAILS_REQUIRED",
      "Customer phone is required for Shadowfax shipment."
    ),
    address_line_1: requireValue(
      address.addressLine,
      "SHADOWFAX_CUSTOMER_DETAILS_REQUIRED",
      "Customer address is required for Shadowfax shipment."
    ),
    city: requireValue(
      address.city,
      "SHADOWFAX_CUSTOMER_DETAILS_REQUIRED",
      "Customer city is required for Shadowfax shipment."
    ),
    state: requireValue(
      address.state,
      "SHADOWFAX_CUSTOMER_DETAILS_REQUIRED",
      "Customer state is required for Shadowfax shipment."
    ),
    pincode: requirePincodeNumber(
      address.pincode,
      "SHADOWFAX_CUSTOMER_DETAILS_REQUIRED",
      "Customer pincode is required for Shadowfax shipment."
    ),
  };
}

function getProductDetails(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (!items.length) {
    throw createShadowfaxError(
      "SHADOWFAX_PRODUCT_DETAILS_REQUIRED",
      "Order items are required for Shadowfax shipment.",
      409
    );
  }

  return items.map((item) => {
    const quantity = Number(item?.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw createShadowfaxError(
        "SHADOWFAX_PRODUCT_DETAILS_REQUIRED",
        "Order item quantity is required for Shadowfax shipment.",
        409
      );
    }

    const price = Number(item?.unitPrice);
    if (!Number.isFinite(price) || price < 0) {
      throw createShadowfaxError(
        "SHADOWFAX_PRODUCT_DETAILS_REQUIRED",
        "Order item price is required for Shadowfax shipment.",
        409
      );
    }

    const product = {
      hsn_code: optionalHsnCode(item?.hsnCode),
      sku_name: requireValue(
        [item?.name, item?.size].filter(Boolean).join(" "),
        "SHADOWFAX_PRODUCT_DETAILS_REQUIRED",
        "Order item name is required for Shadowfax shipment."
      ),
      sku_id: requireValue(
        item?.sku,
        "SHADOWFAX_PRODUCT_DETAILS_REQUIRED",
        "Order item SKU is required for Shadowfax shipment."
      ),
      price,
      additional_details: {
        quantity,
      },
    };

    return removeUndefined(product);
  });
}

function buildCreatePayload(order) {
  const pickupDetails = getPickupDetails();
  const paymentFields = getPaymentFields(order);
  const weightFields = getShadowfaxWeightFields(order);

  return {
    order_type: "warehouse",
    order_details: {
      client_order_id: requireValue(
        order?.orderNumber,
        "SHADOWFAX_ORDER_REFERENCE_REQUIRED",
        "Order number is required for Shadowfax shipment."
      ),
      ...weightFields,
      ...paymentFields,
    },
    customer_details: getCustomerDetails(order),
    pickup_details: pickupDetails,
    rto_details: getRtoDetails(pickupDetails),
    product_details: getProductDetails(order),
  };
}

function hasStoredShadowfaxIdentity(order) {
  return Boolean(order?.shadowfax?.orderId || order?.shadowfax?.awbNumber);
}

function getShadowfaxCreationFields(payload, fallbackClientOrderId) {
  const data = payload?.data || payload || {};
  return {
    orderId: cleanString(data.id),
    awbNumber: cleanString(data.awb_number),
    clientOrderId: cleanString(data.client_order_id || fallbackClientOrderId),
    shipmentStatus: cleanString(data.status),
    statusDisplay: cleanString(data.status_display),
    trackingUrl: cleanString(data.customer_track_url),
  };
}

export async function syncShipment(order) {
  const orderId = order?._id;
  if (!orderId) {
    throw createShadowfaxError(
      "SHADOWFAX_ORDER_REQUIRED",
      "Order is required for Shadowfax sync.",
      400
    );
  }

  if (order?.shippingProvider !== SHADOWFAX_PROVIDER_ID) {
    throw createShadowfaxError(
      "SHADOWFAX_ORDER_PROVIDER_MISMATCH",
      "Order is not assigned to Shadowfax.",
      409
    );
  }

  if (hasStoredShadowfaxIdentity(order)) {
    return { ok: true, skipped: true, order };
  }

  const now = new Date();
  const claimedOrder = await Order.findOneAndUpdate(
    {
      _id: orderId,
      shippingProvider: SHADOWFAX_PROVIDER_ID,
      $and: [
        {
          $or: [
            { "shadowfax.orderId": { $exists: false } },
            { "shadowfax.orderId": null },
            { "shadowfax.orderId": "" },
          ],
        },
        {
          $or: [
            { "shadowfax.awbNumber": { $exists: false } },
            { "shadowfax.awbNumber": null },
            { "shadowfax.awbNumber": "" },
          ],
        },
      ],
      $or: [
        { "shadowfax.syncStatus": { $exists: false } },
        { "shadowfax.syncStatus": { $in: ["pending", "failed"] } },
      ],
    },
    {
      $set: {
        "shadowfax.syncStatus": "syncing",
        "shadowfax.lastError": "",
        "shadowfax.lastAttemptAt": now,
        "shadowfax.syncStartedAt": now,
      },
    },
    { returnDocument: "after" }
  );

  if (!claimedOrder) {
    const latestOrder = await Order.findById(orderId);
    return {
      ok: hasStoredShadowfaxIdentity(latestOrder),
      skipped: hasStoredShadowfaxIdentity(latestOrder),
      inProgress: latestOrder?.shadowfax?.syncStatus === "syncing",
      needsReconciliation:
        latestOrder?.shadowfax?.syncStatus === "needs_reconciliation",
      order: latestOrder || order,
    };
  }

  try {
    assertApiEnabled();
    const payload = buildCreatePayload(claimedOrder);
    const response = await shadowfaxRequest("/v3/clients/orders/", {
      method: "POST",
      body: payload,
    });
    const fields = getShadowfaxCreationFields(
      response,
      claimedOrder.orderNumber
    );

    if (!fields.orderId && !fields.awbNumber) {
      throw createShadowfaxError(
        "SHADOWFAX_CREATE_RESPONSE_INVALID",
        "Shadowfax create response did not include a shipment identifier.",
        502,
        { providerMessage: getProviderMessage(response) }
      );
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      claimedOrder._id,
      {
        $set: {
          shippingProvider: SHADOWFAX_PROVIDER_ID,
          "shadowfax.orderId": fields.orderId,
          "shadowfax.awbNumber": fields.awbNumber,
          "shadowfax.clientOrderId": fields.clientOrderId,
          "shadowfax.trackingUrl": fields.trackingUrl,
          "shadowfax.shipmentStatus": fields.shipmentStatus,
          "shadowfax.statusDisplay": fields.statusDisplay,
          "shadowfax.syncStatus": "created",
          "shadowfax.lastError": "",
          "shadowfax.lastSyncedAt": new Date(),
        },
        $unset: {
          "shadowfax.syncStartedAt": "",
        },
      },
      { returnDocument: "after" }
    );

    return {
      ok: true,
      order: updatedOrder || claimedOrder,
      shadowfax: fields,
    };
  } catch (error) {
    const status = Number(error?.status);

    const provider5xx =
      error?.code === "SHADOWFAX_REQUEST_FAILED" &&
      Number.isFinite(status) &&
      status >= 500 &&
      status < 600;

    const ambiguousSuccessfulResponse =
      error?.code === "SHADOWFAX_CREATE_RESPONSE_INVALID";

    const needsReconciliation =
      Boolean(error?.requestMayHaveReachedProvider) ||
      provider5xx ||
      ambiguousSuccessfulResponse;

    const syncStatus = needsReconciliation
      ? "needs_reconciliation"
      : "failed";

    const failedOrder = await Order.findByIdAndUpdate(
      claimedOrder._id,
      {
        $set: {
          "shadowfax.syncStatus": syncStatus,
          "shadowfax.lastError": sanitizeShadowfaxError(error),
          "shadowfax.lastAttemptAt": new Date(),
        },
        $unset: {
          "shadowfax.syncStartedAt": "",
        },
      },
      { returnDocument: "after" }
    );

    return {
      ok: false,
      order: failedOrder || claimedOrder,
      error: sanitizeShadowfaxError(error),
      syncStatus,
    };
  }
}

function getTrackingFields(payload, fallbackAwb) {
  const orderDetails = payload?.order_details || payload?.data?.order_details || {};
  const trackingDetails =
    payload?.tracking_details ||
    payload?.data?.tracking_details ||
    orderDetails?.tracking_details ||
    [];
  const latestEvent = Array.isArray(trackingDetails)
    ? trackingDetails[trackingDetails.length - 1]
    : null;

  return {
    awbNumber: cleanString(orderDetails.awb_number || latestEvent?.awb_number || fallbackAwb),
    clientOrderId: cleanString(orderDetails.client_order_id || payload?.client_order_id),
    shipmentStatus: cleanString(
      orderDetails.status || latestEvent?.status_id || latestEvent?.status
    ),
    statusDisplay: cleanString(
      orderDetails.status_display || latestEvent?.status || orderDetails.status
    ),
    trackingUrl: cleanString(orderDetails.customer_track_url),
    events: Array.isArray(trackingDetails)
      ? trackingDetails.map((event) => ({
          created: event?.created,
          location: event?.location,
          statusId: event?.status_id,
          status: event?.status,
          remarks: event?.remarks,
          awbNumber: event?.awb_number,
        }))
      : [],
  };
}

export async function trackShipment(order) {
  const awbNumber = cleanString(order?.shadowfax?.awbNumber);
  if (!awbNumber) {
    return {
      available: false,
      orderId: order?._id ? String(order._id) : "",
      orderNumber: order?.orderNumber,
      status: order?.shadowfax?.shipmentStatus || order?.orderStatus,
    };
  }

  const ttlMs = parsePositiveMs(
    process.env.SHADOWFAX_TRACKING_CACHE_TTL_MS,
    DEFAULT_TRACKING_CACHE_TTL_MS
  );
  const cached = getCached(trackingCache, awbNumber, ttlMs);
  if (cached) return cached;

  if (trackingInFlight.has(awbNumber)) {
    return trackingInFlight.get(awbNumber);
  }

  const request = (async () => {
    const payload = await shadowfaxRequest(
      `/v4/clients/orders/${encodeURIComponent(awbNumber)}/track/`
    );
    const fields = getTrackingFields(payload, awbNumber);

    order.shadowfax = {
      ...(order.shadowfax || {}),
      awbNumber: fields.awbNumber || awbNumber,
      clientOrderId: fields.clientOrderId || order.shadowfax?.clientOrderId || "",
      shipmentStatus: fields.shipmentStatus,
      statusDisplay: fields.statusDisplay,
      trackingUrl: fields.trackingUrl || order.shadowfax?.trackingUrl || "",
      lastSyncedAt: new Date(),
    };

    applyStatusToOrder(order, fields.shipmentStatus);
    await order.save();

    return setCached(trackingCache, awbNumber, {
      available: true,
      provider: SHADOWFAX_PROVIDER_ID,
      awbCode: fields.awbNumber || awbNumber,
      trackingUrl: order.shadowfax.trackingUrl,
      status: order.shadowfax.shipmentStatus,
      statusDisplay: order.shadowfax.statusDisplay,
      orderStatus: order.orderStatus,
      events: fields.events,
    });
  })();

  trackingInFlight.set(awbNumber, request);
  try {
    return await request;
  } finally {
    trackingInFlight.delete(awbNumber);
  }
}

export async function cancelShipment(order) {
  const requestId = cleanString(order?.shadowfax?.awbNumber || order?.shadowfax?.orderId);
  if (!requestId) {
    return {
      provider: SHADOWFAX_PROVIDER_ID,
      skipped: true,
      cancelStatus: "not_required",
    };
  }

  const response = await shadowfaxRequest("/v3/clients/orders/cancel/", {
    method: "POST",
    body: {
      request_id: requestId,
      cancel_remarks: "Request cancelled by customer",
    },
  });

  const responseCode = Number(response?.responseCode);
  if (Number.isFinite(responseCode) && ![200, 304].includes(responseCode)) {
    throw createShadowfaxError(
      "SHADOWFAX_CANCEL_REJECTED",
      "Shadowfax did not accept the cancellation request.",
      502,
      { providerMessage: getProviderMessage(response) }
    );
  }

  const cancelStatus = "cancelled";
  order.shadowfax = {
    ...(order.shadowfax || {}),
    cancelStatus,
    cancelError: "",
    cancelledAt: cancelStatus === "cancelled" ? new Date() : undefined,
  };
  await order.save();

  return {
    provider: SHADOWFAX_PROVIDER_ID,
    skipped: false,
    cancelStatus,
    responseCode: Number.isFinite(responseCode) ? responseCode : undefined,
  };
}

function normalizeStatus(rawStatus) {
  return cleanString(rawStatus).toLowerCase();
}

export function mapStatusToOrderStatus(rawStatus, order) {
  const status = normalizeStatus(rawStatus);
  if (!status) return "";

  if (status === "new") return "confirmed";

  if (
    [
      "picked",
      "received_from_client_warehouse",
      "assigned_for_seller_pickup",
      "ofp",
    ].includes(status)
  ) {
    return "processing";
  }

  if (["bag_in_transit", "recd_at_fwd_hub", "recd_at_fwd_dc"].includes(status)) {
    return "in_transit";
  }

  if (["assigned_for_delivery", "ofd"].includes(status)) {
    return "out_for_delivery";
  }

  if (status === "delivered") return "delivered";

  if (
    ["cancelled_by_customer", "cancelled_by_seller"].includes(status) &&
    ["processing", "cancelled"].includes(order?.cancellation?.status)
  ) {
    return "cancelled";
  }

  return "";
}

export function applyStatusToOrder(order, rawStatus) {
  const mappedStatus = mapStatusToOrderStatus(rawStatus, order);
  if (!mappedStatus || !order || order.orderStatus === "cancelled") {
    return false;
  }

  order.orderStatus = mappedStatus;
  return true;
}

function hasCancellationTarget(order) {
  return Boolean(order?.shadowfax?.awbNumber || order?.shadowfax?.orderId);
}

export const shadowfaxProvider = {
  id: SHADOWFAX_PROVIDER_ID,
  label: "Shadowfax",
  checkServiceability,
  validateCheckoutServiceability,
  syncShipment,
  trackShipment,
  cancelShipment,
  hasCancellationTarget,
  mapStatusToOrderStatus,
  applyStatusToOrder,
};
