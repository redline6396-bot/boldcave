import Order from "@/models/Order";
import { calculateShipmentWeightKg } from "@/lib/shipping/shipmentWeight";
import {
  DELHIVERY_PROVIDER_ID,
  createDelhiveryError,
  delhiveryRequest,
  getDelhiveryProviderMessage,
  sanitizeDelhiveryError,
} from "@/lib/shipping/providers/delhiveryClient";

export { DELHIVERY_PROVIDER_ID };

const DEFAULT_SERVICEABILITY_CACHE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_TRACKING_CACHE_TTL_MS = 60 * 1000;
const EWAY_BILL_THRESHOLD_INR = 50000;

const serviceabilityCache = new Map();
const serviceabilityInFlight = new Map();
const trackingCache = new Map();
const trackingInFlight = new Map();

const ORDER_STATUS_RANK = new Map([
  ["shipping_pending", 0],
  ["confirmed", 1],
  ["processing", 2],
  ["shipped", 3],
  ["in_transit", 4],
  ["out_for_delivery", 5],
  ["delivered", 6],
]);

function cleanString(value) {
  return String(value || "").trim();
}

function getTrackingUrl(waybill, providerUrl = "") {
  const suppliedUrl = cleanString(providerUrl);
  if (/^https:\/\//i.test(suppliedUrl)) return suppliedUrl;
  const normalizedWaybill = cleanString(waybill);
  return normalizedWaybill
    ? `https://www.delhivery.com/track/package/${encodeURIComponent(normalizedWaybill)}`
    : "";
}

function parsePositiveMs(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function requireValue(value, code, message) {
  const cleaned = cleanString(value);
  if (!cleaned) throw createDelhiveryError(code, message, 500);
  return cleaned;
}

function optionalValue(value) {
  const cleaned = cleanString(value);
  return cleaned || undefined;
}

function getOptionalManifestShippingMode(value) {
  const mode = cleanString(value).toLowerCase();
  if (!mode) return undefined;
  if (mode === "surface") return "Surface";
  if (mode === "express") return "Express";
  throw createDelhiveryError(
    "DELHIVERY_SHIPPING_MODE_INVALID",
    "Delhivery shipping mode must be Surface or Express.",
    500
  );
}

function getOptionalManifestBoolean(value, code, label) {
  const normalized = cleanString(value).toLowerCase();
  if (!normalized) return undefined;
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;
  throw createDelhiveryError(code, `${label} must be true or false.`, 500);
}

function removeUndefined(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  );
}

function normalizeProviderText(value, maxLength = 200) {
  return cleanString(value)
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s.,&()/#'-]/gu, " ")
    .replace(/\s+/g, " ")
    .slice(0, maxLength)
    .trim();
}

function normalizePhone(value) {
  const digits = cleanString(value).replace(/\D/g, "");
  const phone = digits.length > 10 ? digits.slice(-10) : digits;
  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw createDelhiveryError(
      "DELHIVERY_CUSTOMER_DETAILS_REQUIRED",
      "A valid customer phone is required for Delhivery shipment.",
      409
    );
  }
  return phone;
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

function flagIsEnabled(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return ["y", "yes", "true", "1", "available", "serviceable"].includes(
    cleanString(value).toLowerCase()
  );
}

function getPostalCode(payload) {
  const deliveryCodes = Array.isArray(payload?.delivery_codes)
    ? payload.delivery_codes
    : [];
  return deliveryCodes[0]?.postal_code || null;
}

function getServiceFlag(postalCode, names) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(postalCode || {}, name)) {
      return flagIsEnabled(postalCode[name]);
    }
  }
  return false;
}

export async function checkServiceability({ deliveryPincode, cod = false }) {
  const pincode = cleanString(deliveryPincode);
  if (!/^\d{6}$/.test(pincode)) {
    throw createDelhiveryError("INVALID_PINCODE", "Invalid pincode", 400);
  }

  const cacheKey = `${pincode}:${cod ? "cod" : "prepaid"}`;
  const ttlMs = parsePositiveMs(
    process.env.DELHIVERY_SERVICEABILITY_CACHE_TTL_MS,
    DEFAULT_SERVICEABILITY_CACHE_TTL_MS
  );
  const cached = getCached(serviceabilityCache, cacheKey, ttlMs);
  if (cached) return cached;
  if (serviceabilityInFlight.has(cacheKey)) {
    return serviceabilityInFlight.get(cacheKey);
  }

  const request = (async () => {
    const params = new URLSearchParams({ filter_codes: pincode });
    const payload = await delhiveryRequest(`/c/api/pin-codes/json/?${params}`);
    const postalCode = getPostalCode(payload);
    const remarks = cleanString(postalCode?.remarks || postalCode?.remark);
    const embargoed = /embargo/i.test(remarks);
    const prepaidAvailable =
      Boolean(postalCode) &&
      !embargoed &&
      getServiceFlag(postalCode, ["pre_paid", "prepaid", "pre_paid_service"]);
    const codAvailable =
      Boolean(postalCode) &&
      !embargoed &&
      getServiceFlag(postalCode, [
        "cash",
        "cod",
        "cash_on_delivery",
        "cod_available",
      ]);
    const serviceable = cod ? codAvailable : prepaidAvailable;
    const services = [
      ...(prepaidAvailable ? ["prepaid"] : []),
      ...(codAvailable ? ["cod"] : []),
    ];

    return setCached(serviceabilityCache, cacheKey, {
      provider: DELHIVERY_PROVIDER_ID,
      serviceable,
      code: serviceable ? "SERVICEABLE" : "UNSERVICEABLE",
      message: serviceable
        ? "Delivery is available for this pincode."
        : embargoed
          ? "Delivery is temporarily unavailable for this pincode."
          : cod
            ? "Cash on Delivery is not available for this pincode."
            : "Prepaid delivery is not available for this pincode.",
      codAvailable,
      prepaidAvailable,
      services,
      couriers: [
        {
          courier_name: "Delhivery",
          cod: codAvailable,
          prepaid: prepaidAvailable,
        },
      ],
      rawServiceabilitySummary: {
        pincode,
        district: cleanString(postalCode?.district),
        stateCode: cleanString(postalCode?.state_code),
        remarks,
      },
    });
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
        code: cod ? "DELHIVERY_COD_UNSERVICEABLE" : "DELHIVERY_UNSERVICEABLE",
        message: result.message,
        status: 422,
        retryable: false,
      };
    }
    return { ok: true, result };
  } catch (error) {
    return {
      ok: false,
      code: error?.code || "DELHIVERY_SERVICEABILITY_TEMPORARY_ERROR",
      message: "Delivery availability could not be verified right now. Please retry.",
      status: error?.status || 503,
      retryable: ![
        "DELHIVERY_API_DISABLED",
        "DELHIVERY_TOKEN_REQUIRED",
        "DELHIVERY_AUTH_ERROR",
      ].includes(error?.code),
      detail: sanitizeDelhiveryError(error),
    };
  }
}

function getManifestConfig() {
  return {
    clientName: requireValue(
      process.env.DELHIVERY_CLIENT_NAME,
      "DELHIVERY_CLIENT_NAME_REQUIRED",
      "Delhivery client name is not configured."
    ),
    pickupLocation: requireValue(
      process.env.DELHIVERY_PICKUP_LOCATION,
      "DELHIVERY_PICKUP_LOCATION_REQUIRED",
      "Delhivery pickup location is not configured."
    ),
    sellerGstin: requireValue(
      process.env.DELHIVERY_SELLER_GSTIN,
      "DELHIVERY_SELLER_GSTIN_REQUIRED",
      "Delhivery seller GSTIN is not configured."
    ),
    clientGstin: optionalValue(process.env.DELHIVERY_CLIENT_GSTIN),
    shippingMode: getOptionalManifestShippingMode(
      process.env.DELHIVERY_SHIPPING_MODE
    ),
    fragileShipment: getOptionalManifestBoolean(
      process.env.DELHIVERY_FRAGILE_SHIPMENT,
      "DELHIVERY_FRAGILE_SHIPMENT_INVALID",
      "Delhivery fragile shipment setting"
    ),
  };
}

function formatIndiaDateTime(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

function getShipmentWeightGrams(order) {
  const weightKg = calculateShipmentWeightKg(order?.items || []);
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw createDelhiveryError(
      "DELHIVERY_WEIGHT_REQUIRED",
      "Order weight is required for Delhivery shipment.",
      409
    );
  }
  return Math.round(weightKg * 1000);
}

function getShipmentDimensionsCm(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (!items.length) {
    throw createDelhiveryError(
      "DELHIVERY_DIMENSIONS_REQUIRED",
      "Order dimensions are required for Delhivery shipment.",
      409
    );
  }

  const dimensions = items.reduce(
    (packageDimensions, item) => {
      const length = Number(item?.lengthCm);
      const width = Number(item?.breadthCm);
      const height = Number(item?.heightCm);
      if (
        !Number.isFinite(length) ||
        length <= 0 ||
        !Number.isFinite(width) ||
        width <= 0 ||
        !Number.isFinite(height) ||
        height <= 0
      ) {
        throw createDelhiveryError(
          "DELHIVERY_DIMENSIONS_REQUIRED",
          `Valid shipping dimensions are required for ${cleanString(item?.name) || "every order item"}.`,
          409
        );
      }

      return {
        shipment_length: Math.max(packageDimensions.shipment_length, length),
        shipment_width: Math.max(packageDimensions.shipment_width, width),
        shipment_height: Math.max(packageDimensions.shipment_height, height),
      };
    },
    { shipment_length: 0, shipment_width: 0, shipment_height: 0 }
  );

  return Object.fromEntries(
    Object.entries(dimensions).map(([key, value]) => [
      key,
      Number(value.toFixed(2)),
    ])
  );
}

function getHsnCodes(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const codes = items.map((item) => cleanString(item?.hsnCode));
  if (!codes.length || codes.some((code) => !/^(?:\d{4}|\d{6}|\d{8})$/.test(code))) {
    throw createDelhiveryError(
      "DELHIVERY_HSN_REQUIRED",
      "Valid HSN data is required for every Delhivery shipment item.",
      409
    );
  }
  return Array.from(new Set(codes));
}

function getProductsDescription(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (!items.length) {
    throw createDelhiveryError(
      "DELHIVERY_PRODUCT_DETAILS_REQUIRED",
      "Order items are required for Delhivery shipment.",
      409
    );
  }

  return items
    .map((item) => {
      const quantity = Number(item?.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw createDelhiveryError(
          "DELHIVERY_PRODUCT_DETAILS_REQUIRED",
          "Order item quantity is required for Delhivery shipment.",
          409
        );
      }
      return normalizeProviderText(
        `${item?.name || ""}${item?.size ? ` ${item.size}` : ""} x ${quantity}`,
        120
      );
    })
    .join(", ")
    .slice(0, 500);
}

function getPaymentFields(order) {
  const method = cleanString(order?.payment?.method).toLowerCase();
  const paymentStatus = cleanString(order?.payment?.paymentStatus).toLowerCase();
  const finalAmount = Number(order?.amounts?.finalAmount);
  if (!Number.isFinite(finalAmount) || finalAmount < 0) {
    throw createDelhiveryError(
      "DELHIVERY_ORDER_AMOUNT_INVALID",
      "Order amount is invalid.",
      409
    );
  }

  if (finalAmount > EWAY_BILL_THRESHOLD_INR) {
    throw createDelhiveryError(
      "DELHIVERY_EWAYBILL_REQUIRED",
      "An e-way bill is required for this shipment before it can be manifested.",
      409
    );
  }

  if (method === "cod") {
    return { payment_mode: "COD", cod_amount: finalAmount };
  }
  if (method === "razorpay" && paymentStatus === "paid") {
    return { payment_mode: "Pre-paid", cod_amount: 0 };
  }

  throw createDelhiveryError(
    "DELHIVERY_PAYMENT_STATE_INVALID",
    "Order payment state is not ready for Delhivery shipment.",
    409
  );
}

function buildManifestPayload(order) {
  const config = getManifestConfig();
  const address = order?.deliveryAddress || {};
  const items = Array.isArray(order?.items) ? order.items : [];
  const orderNumber = requireValue(
    order?.orderNumber,
    "DELHIVERY_ORDER_REFERENCE_REQUIRED",
    "Order number is required for Delhivery shipment."
  );
  const totalAmount = Number(order?.amounts?.finalAmount);
  const quantity = items.reduce((total, item) => total + Number(item?.quantity || 0), 0);
  const hsnCodes = getHsnCodes(order);
  const payment = getPaymentFields(order);
  const dimensions = getShipmentDimensionsCm(order);

  const shipment = removeUndefined({
    name: requireValue(
      normalizeProviderText(address.fullName, 100),
      "DELHIVERY_CUSTOMER_DETAILS_REQUIRED",
      "Customer name is required for Delhivery shipment."
    ),
    add: requireValue(
      normalizeProviderText(address.addressLine, 250),
      "DELHIVERY_CUSTOMER_DETAILS_REQUIRED",
      "Customer address is required for Delhivery shipment."
    ),
    pin: requireValue(
      address.pincode,
      "DELHIVERY_CUSTOMER_DETAILS_REQUIRED",
      "Customer pincode is required for Delhivery shipment."
    ),
    city: requireValue(
      normalizeProviderText(address.city, 80),
      "DELHIVERY_CUSTOMER_DETAILS_REQUIRED",
      "Customer city is required for Delhivery shipment."
    ),
    state: requireValue(
      normalizeProviderText(address.state, 80),
      "DELHIVERY_CUSTOMER_DETAILS_REQUIRED",
      "Customer state is required for Delhivery shipment."
    ),
    address_type:
      cleanString(address.type).toLowerCase() === "work" ? "office" : "home",
    country: "India",
    phone: normalizePhone(order?.customer?.phone),
    order: orderNumber,
    invoice_reference: orderNumber,
    order_date: formatIndiaDateTime(order?.createdAt || new Date()),
    products_desc: getProductsDescription(order),
    hsn_code: hsnCodes.join(","),
    total_amount: totalAmount,
    quantity,
    weight: getShipmentWeightGrams(order),
    ...dimensions,
    client: config.clientName,
    shipping_mode: config.shippingMode,
    fragile_shipment: config.fragileShipment,
    seller_gst_tin: config.sellerGstin,
    client_gst_tin: config.clientGstin,
    ...payment,
  });

  return {
    payload: {
      shipments: [shipment],
      pickup_location: { name: config.pickupLocation },
    },
    orderNumber,
  };
}

function getManifestPackage(payload) {
  const packages = Array.isArray(payload?.packages)
    ? payload.packages
    : Array.isArray(payload?.data?.packages)
      ? payload.data.packages
      : [];
  return packages[0] || payload?.package || payload?.data?.package || {};
}

function getManifestFields(payload, fallbackReference) {
  const packageResult = getManifestPackage(payload);
  const waybill = cleanString(
    packageResult?.waybill ||
      packageResult?.waybill_number ||
      packageResult?.wbn ||
      packageResult?.awb ||
      payload?.upload_wbn
  );
  return {
    waybill,
    referenceNo: cleanString(
      packageResult?.refnum ||
        packageResult?.reference_no ||
        packageResult?.order ||
        fallbackReference
    ),
    shipmentStatus: cleanString(packageResult?.status || payload?.status),
    statusDisplay: cleanString(
      packageResult?.status_display || packageResult?.status || payload?.status
    ),
    trackingUrl: getTrackingUrl(
      waybill,
      packageResult?.tracking_url ||
        packageResult?.trackingUrl ||
        payload?.tracking_url ||
        payload?.trackingUrl
    ),
  };
}

const MANIFEST_DIAGNOSTIC_FIELDS = new Set([
  "code",
  "error",
  "errors",
  "message",
  "remark",
  "remarks",
  "rmk",
  "status",
]);

function sanitizeManifestDiagnosticText(value) {
  let text = cleanString(value);
  const apiToken = cleanString(process.env.DELHIVERY_API_TOKEN);
  if (apiToken) text = text.split(apiToken).join("[redacted-token]");

  return text
    .replace(/\bToken\s+[^\s,;]+/gi, "Token [redacted]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b(?:\+?91[-\s]?)?[6-9]\d{9}\b/g, "[redacted-phone]")
    .slice(0, 500);
}

function sanitizeManifestResponseBody(value, key = "", depth = 0) {
  if (depth > 6) return "[truncated]";
  if (value === null || value === undefined) return value;

  const normalizedKey = cleanString(key).toLowerCase();
  if (
    /authorization|token|api.?key|secret|phone|email|address|^add$|gst|hsn|customer|products_desc|^name$/.test(
      normalizedKey
    )
  ) {
    return "[redacted]";
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 20)
      .map((entry) => sanitizeManifestResponseBody(entry, key, depth + 1));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        sanitizeManifestResponseBody(entryValue, entryKey, depth + 1),
      ])
    );
  }
  if (typeof value === "string") return sanitizeManifestDiagnosticText(value);
  return value;
}

function collectManifestProviderDetails(value, details, depth = 0) {
  if (value === null || value === undefined || depth > 6) return;
  if (Array.isArray(value)) {
    value.slice(0, 20).forEach((entry) => {
      if (entry && typeof entry === "object") {
        collectManifestProviderDetails(entry, details, depth + 1);
      } else {
        const detail = sanitizeManifestDiagnosticText(entry);
        if (detail && !details.includes(detail)) details.push(detail);
      }
    });
    return;
  }
  if (typeof value !== "object") return;

  Object.entries(value).forEach(([key, entry]) => {
    const normalizedKey = cleanString(key).toLowerCase();
    if (MANIFEST_DIAGNOSTIC_FIELDS.has(normalizedKey)) {
      if (entry && typeof entry === "object") {
        collectManifestProviderDetails(entry, details, depth + 1);
      } else {
        const detail = sanitizeManifestDiagnosticText(entry);
        const labelledDetail = detail ? `${normalizedKey}=${detail}` : "";
        if (labelledDetail && !details.includes(labelledDetail)) {
          details.push(labelledDetail);
        }
      }
    } else if (entry && typeof entry === "object") {
      collectManifestProviderDetails(entry, details, depth + 1);
    }
  });
}

function getManifestProviderDetailMessage(payload) {
  const details = [];
  collectManifestProviderDetails(payload, details);
  return details.join("; ").slice(0, 300);
}

function getManifestStoredError(error, providerPayload) {
  const details = [
    providerPayload
      ? "HTTP 200"
      : Number.isFinite(Number(error?.status))
        ? `HTTP ${Number(error.status)}`
        : "",
    getManifestProviderDetailMessage(providerPayload),
    sanitizeManifestDiagnosticText(error?.details?.providerMessage),
    sanitizeManifestDiagnosticText(error?.code),
    sanitizeManifestDiagnosticText(error?.message),
  ].filter(Boolean);

  return Array.from(new Set(details)).join("; ").slice(0, 300);
}

function positiveDimension(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function getManifestDiagnosticContext(order, payload) {
  const shipment = payload?.shipments?.[0] || {};
  const items = Array.isArray(order?.items) ? order.items : [];
  const weightKg = calculateShipmentWeightKg(items);
  const paymentMethod = cleanString(order?.payment?.method).toLowerCase();

  return {
    orderNumber: cleanString(order?.orderNumber),
    pickupLocationName: cleanString(
      payload?.pickup_location?.name || process.env.DELHIVERY_PICKUP_LOCATION
    ),
    paymentMode:
      cleanString(shipment?.payment_mode) ||
      (paymentMethod === "cod" ? "COD" : paymentMethod === "razorpay" ? "Pre-paid" : ""),
    pincode: cleanString(shipment?.pin || order?.deliveryAddress?.pincode),
    package: {
      weightGrams:
        Number.isFinite(Number(shipment?.weight)) && Number(shipment.weight) > 0
          ? Number(shipment.weight)
          : weightKg > 0
            ? Math.round(weightKg * 1000)
            : null,
      dimensionsSentToDelhivery: Boolean(
        shipment?.shipment_length || shipment?.shipment_width || shipment?.shipment_height
      ),
      dimensionsCm: {
        length: positiveDimension(shipment?.shipment_length),
        width: positiveDimension(shipment?.shipment_width),
        height: positiveDimension(shipment?.shipment_height),
      },
      orderItemDimensionsCm: items.map((item) => ({
        quantity: Number(item?.quantity) || 0,
        length: positiveDimension(item?.lengthCm),
        breadth: positiveDimension(item?.breadthCm),
        height: positiveDimension(item?.heightCm),
      })),
    },
    sellerGstPresent: Boolean(
      cleanString(shipment?.seller_gst_tin || process.env.DELHIVERY_SELLER_GSTIN)
    ),
    hsnPresent: Boolean(
      cleanString(shipment?.hsn_code) ||
        (items.length > 0 && items.every((item) => cleanString(item?.hsnCode)))
    ),
  };
}

function manifestMayBePartiallySaved(error, payload) {
  const message = [
    error?.details?.providerMessage,
    error?.message,
    getDelhiveryProviderMessage(payload),
  ]
    .filter(Boolean)
    .join(" ");
  return /partial(?:ly)?\s+save|may have been saved|already exists|duplicate|waybill.*generated/i.test(
    message
  );
}

function hasStoredDelhiveryIdentity(order) {
  return Boolean(cleanString(order?.delhivery?.waybill));
}

async function scheduleAutomaticPickupWithoutAffectingShipment() {
  try {
    const { ensureDelhiveryPickupScheduled } = await import(
      "@/lib/shipping/delhiveryPickup"
    );
    await ensureDelhiveryPickupScheduled({ automatic: true });
  } catch (error) {
    console.error("Delhivery automatic pickup scheduling failed", {
      code: error?.code,
      message: sanitizeDelhiveryError(error),
    });
  }
}

export async function syncShipment(order) {
  const orderId = order?._id;
  if (!orderId) {
    throw createDelhiveryError(
      "DELHIVERY_ORDER_REQUIRED",
      "Order is required for Delhivery sync.",
      400
    );
  }
  if (order?.shippingProvider !== DELHIVERY_PROVIDER_ID) {
    throw createDelhiveryError(
      "DELHIVERY_ORDER_PROVIDER_MISMATCH",
      "Order is not assigned to Delhivery.",
      409
    );
  }
  if (hasStoredDelhiveryIdentity(order)) {
    return { ok: true, skipped: true, order };
  }

  const now = new Date();
  const claimedOrder = await Order.findOneAndUpdate(
    {
      _id: orderId,
      shippingProvider: DELHIVERY_PROVIDER_ID,
      $or: [
        { "delhivery.waybill": { $exists: false } },
        { "delhivery.waybill": null },
        { "delhivery.waybill": "" },
      ],
      "delhivery.syncStatus": { $in: [null, "pending", "failed"] },
    },
    {
      $set: {
        "delhivery.syncStatus": "syncing",
        "delhivery.lastError": "",
        "delhivery.lastAttemptAt": now,
        "delhivery.syncStartedAt": now,
      },
    },
    { returnDocument: "after" }
  );

  if (!claimedOrder) {
    const latestOrder = await Order.findById(orderId);
    return {
      ok: hasStoredDelhiveryIdentity(latestOrder),
      skipped: hasStoredDelhiveryIdentity(latestOrder),
      inProgress: latestOrder?.delhivery?.syncStatus === "syncing",
      needsReconciliation:
        latestOrder?.delhivery?.syncStatus === "needs_reconciliation",
      order: latestOrder || order,
    };
  }

  let providerPayload;
  let manifestDiagnostic = getManifestDiagnosticContext(claimedOrder);
  try {
    const { payload, orderNumber } = buildManifestPayload(claimedOrder);
    manifestDiagnostic = getManifestDiagnosticContext(claimedOrder, payload);
    const form = new URLSearchParams({
      format: "json",
      data: JSON.stringify(payload),
    });
    console.info("TEMP Delhivery manifestation request diagnostic", manifestDiagnostic);
    providerPayload = await delhiveryRequest("/api/cmu/create.json", {
      method: "POST",
      body: form.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      mutating: true,
    });
    console.info("TEMP Delhivery manifestation response diagnostic", {
      ...manifestDiagnostic,
      httpStatus: 200,
      responseBody: sanitizeManifestResponseBody(providerPayload),
    });

    const fields = getManifestFields(providerPayload, orderNumber);
    const packageResult = getManifestPackage(providerPayload);
    const providerMessage =
      getManifestProviderDetailMessage(providerPayload) ||
      getDelhiveryProviderMessage(providerPayload);
    const providerRejected =
      providerPayload?.success === false ||
      packageResult?.status === false ||
      /fail|error|invalid/i.test(cleanString(packageResult?.status)) ||
      /\b(fail(?:ed|ure)?|error|invalid|reject(?:ed|ion)?)\b/i.test(
        providerMessage
      );

    if (providerRejected) {
      throw createDelhiveryError(
        "DELHIVERY_MANIFEST_FAILED",
        "Delhivery rejected the shipment manifestation.",
        502,
        { providerMessage }
      );
    }

    if (!fields.waybill) {
      throw createDelhiveryError(
        "DELHIVERY_MANIFEST_RESPONSE_INVALID",
        "Delhivery manifestation did not return a usable waybill.",
        502,
        { providerMessage: getDelhiveryProviderMessage(providerPayload) }
      );
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      claimedOrder._id,
      {
        $set: {
          shippingProvider: DELHIVERY_PROVIDER_ID,
          "delhivery.waybill": fields.waybill,
          "delhivery.referenceNo": fields.referenceNo,
          "delhivery.shipmentStatus": fields.shipmentStatus,
          "delhivery.statusDisplay": fields.statusDisplay,
          "delhivery.trackingUrl": fields.trackingUrl,
          "delhivery.syncStatus": "created",
          "delhivery.lastError": "",
          "delhivery.lastSyncedAt": new Date(),
        },
        $unset: { "delhivery.syncStartedAt": "" },
      },
      { returnDocument: "after" }
    );

    await scheduleAutomaticPickupWithoutAffectingShipment();

    return {
      ok: true,
      order: updatedOrder || claimedOrder,
      delhivery: fields,
    };
  } catch (error) {
    const storedError = getManifestStoredError(error, providerPayload);
    console.error("TEMP Delhivery manifestation failure diagnostic", {
      ...manifestDiagnostic,
      httpStatus: providerPayload
        ? 200
        : Number.isFinite(Number(error?.status))
          ? Number(error.status)
          : null,
      errorCode: sanitizeManifestDiagnosticText(error?.code),
      responseBody: sanitizeManifestResponseBody(
        providerPayload || {
          code: error?.code,
          message: error?.message,
          providerMessage: error?.details?.providerMessage,
        }
      ),
    });
    const status = Number(error?.status);
    const needsReconciliation =
      Boolean(error?.requestMayHaveReachedProvider) ||
      (error?.code === "DELHIVERY_REQUEST_FAILED" && status >= 500) ||
      error?.code === "DELHIVERY_MANIFEST_RESPONSE_INVALID" ||
      Boolean(
        providerPayload &&
          getManifestFields(providerPayload, claimedOrder.orderNumber).waybill
      ) ||
      manifestMayBePartiallySaved(error, providerPayload);
    const syncStatus = needsReconciliation ? "needs_reconciliation" : "failed";
    const failedOrder = await Order.findByIdAndUpdate(
      claimedOrder._id,
      {
        $set: {
          "delhivery.syncStatus": syncStatus,
          "delhivery.lastError": storedError,
          "delhivery.lastAttemptAt": new Date(),
        },
        $unset: { "delhivery.syncStartedAt": "" },
      },
      { returnDocument: "after" }
    );

    return {
      ok: false,
      order: failedOrder || claimedOrder,
      error: storedError,
      syncStatus,
      needsReconciliation,
    };
  }
}

function getTrackingShipment(payload) {
  const shipmentData = Array.isArray(payload?.ShipmentData) ? payload.ShipmentData : [];
  return shipmentData[0]?.Shipment || payload?.Shipment || payload?.shipment || null;
}

function getTrackingFields(payload, fallbackWaybill) {
  const shipment = getTrackingShipment(payload) || {};
  const status = shipment?.Status || shipment?.status || {};
  const scans = Array.isArray(shipment?.Scans)
    ? shipment.Scans
    : Array.isArray(shipment?.scans)
      ? shipment.scans
      : [];
  const events = scans.map((entry) => {
    const detail = entry?.ScanDetail || entry?.scan_detail || entry || {};
    return {
      created: detail.ScanDateTime || detail.StatusDateTime || detail.scan_date_time,
      location: detail.ScannedLocation || detail.StatusLocation || detail.location,
      statusId: detail.ScanType || detail.StatusType || detail.status_type,
      status: detail.Scan || detail.Status || detail.status,
      remarks: detail.Instructions || detail.Remarks || detail.instructions,
      nslCode: detail.NSLCode || detail.nsl_code,
      awbNumber: shipment?.AWB || fallbackWaybill,
    };
  });

  return {
    waybill: cleanString(shipment?.AWB || shipment?.Waybill || fallbackWaybill),
    referenceNo: cleanString(shipment?.ReferenceNo || shipment?.Order || shipment?.refnum),
    shipmentStatus: cleanString(status?.Status || status?.status || shipment?.Status),
    statusType: cleanString(status?.StatusType || status?.status_type),
    statusDisplay: cleanString(
      status?.Status || status?.status || shipment?.Status || shipment?.status
    ),
    statusLocation: cleanString(status?.StatusLocation || status?.status_location),
    instructions: cleanString(status?.Instructions || status?.instructions),
    nslCode: cleanString(shipment?.NSLCode || status?.NSLCode || status?.nsl_code),
    events,
  };
}

function statusValueIndicatesCancellation(value) {
  const status = normalizeStatus(value);
  return status === "cn" || status.includes("cancel");
}

function trackingFieldsIndicateCancellation(fields) {
  return (
    [
      fields?.shipmentStatus,
      fields?.statusType,
      fields?.statusDisplay,
      fields?.instructions,
    ].some(statusValueIndicatesCancellation) ||
    (fields?.events || []).some((event) =>
      [event?.status, event?.statusId, event?.remarks].some(
        statusValueIndicatesCancellation
      )
    )
  );
}

export async function trackShipment(order, { forceRefresh = false } = {}) {
  const waybill = cleanString(order?.delhivery?.waybill);
  if (!waybill) {
    return {
      available: false,
      orderId: order?._id ? String(order._id) : "",
      orderNumber: order?.orderNumber,
      status: order?.delhivery?.shipmentStatus || order?.orderStatus,
    };
  }

  const ttlMs = parsePositiveMs(
    process.env.DELHIVERY_TRACKING_CACHE_TTL_MS,
    DEFAULT_TRACKING_CACHE_TTL_MS
  );
  const cached = forceRefresh ? null : getCached(trackingCache, waybill, ttlMs);
  if (cached) return cached;
  if (trackingInFlight.has(waybill)) return trackingInFlight.get(waybill);

  const request = (async () => {
    const params = new URLSearchParams({ waybill });
    const payload = await delhiveryRequest(`/api/v1/packages/json/?${params}`);
    const fields = getTrackingFields(payload, waybill);
    if (!getTrackingShipment(payload)) {
      throw createDelhiveryError(
        "DELHIVERY_TRACKING_FAILED",
        "Delhivery tracking did not return a shipment.",
        502,
        { providerMessage: getDelhiveryProviderMessage(payload) }
      );
    }

    const externallyCancelled = trackingFieldsIndicateCancellation(fields);
    order.delhivery = {
      ...(order.delhivery || {}),
      waybill: fields.waybill || waybill,
      referenceNo: fields.referenceNo || order.delhivery?.referenceNo || order.orderNumber,
      shipmentStatus: fields.shipmentStatus,
      statusType: fields.statusType,
      statusDisplay: fields.statusDisplay,
      statusLocation: fields.statusLocation,
      instructions: fields.instructions,
      nslCode: fields.nslCode,
      trackingUrl: getTrackingUrl(
        fields.waybill || waybill,
        order.delhivery?.trackingUrl
      ),
      lastSyncedAt: new Date(),
      ...(externallyCancelled
        ? {
            cancelStatus: "cancelled",
            cancelError: "",
            cancelledAt: order.delhivery?.cancelledAt || new Date(),
          }
        : {}),
    };
    applyStatusToOrder(order, fields.shipmentStatus);
    await order.save();

    let persistedOrder = order;
    if (externallyCancelled && order.orderStatus !== "cancelled") {
      const { reconcileExternalShipmentCancellation } = await import(
        "@/lib/orders/cancellation"
      );
      const reconciliation = await reconcileExternalShipmentCancellation({
        orderId: order._id,
        provider: DELHIVERY_PROVIDER_ID,
        reason: "Shipment cancelled in Delhivery",
      });
      persistedOrder = reconciliation.order || order;
    }

    return setCached(trackingCache, waybill, {
      available: true,
      provider: DELHIVERY_PROVIDER_ID,
      awbCode: fields.waybill || waybill,
      trackingUrl: getTrackingUrl(
        fields.waybill || waybill,
        order.delhivery.trackingUrl
      ),
      status: fields.shipmentStatus,
      statusDisplay: fields.statusDisplay,
      orderStatus: persistedOrder.orderStatus,
      events: fields.events,
    });
  })();

  trackingInFlight.set(waybill, request);
  try {
    return await request;
  } finally {
    trackingInFlight.delete(waybill);
  }
}

export async function cancelShipment(order) {
  const waybill = cleanString(order?.delhivery?.waybill);
  if (!waybill) {
    return {
      provider: DELHIVERY_PROVIDER_ID,
      skipped: true,
      cancelStatus: "not_required",
    };
  }

  if (
    [
      order?.delhivery?.shipmentStatus,
      order?.delhivery?.statusType,
      order?.delhivery?.statusDisplay,
      order?.delhivery?.lastWebhookStatus,
      order?.delhivery?.cancelStatus,
    ].some(statusValueIndicatesCancellation)
  ) {
    order.delhivery = {
      ...(order.delhivery || {}),
      cancelStatus: "cancelled",
      cancelError: "",
      cancelledAt: order.delhivery?.cancelledAt || new Date(),
    };
    await order.save();
    return {
      provider: DELHIVERY_PROVIDER_ID,
      skipped: true,
      alreadyCancelled: true,
      cancelStatus: "cancelled",
    };
  }

  try {
    const response = await delhiveryRequest("/api/p/edit", {
      method: "POST",
      body: JSON.stringify({ waybill, cancellation: "true" }),
      headers: { "Content-Type": "application/json" },
      mutating: true,
    });
    const responseText = getDelhiveryProviderMessage(response);
    const alreadyCancelled = /already\s+cancel(?:led|ed)|shipment[^.;]*cancel(?:led|ed)/i.test(
      responseText
    );
    const rejected =
      !alreadyCancelled &&
      (response?.success === false ||
        response?.status === false ||
        /fail|error|invalid|cannot cancel|not cancellable|reject/i.test(responseText));
    const accepted =
      alreadyCancelled ||
      response?.success === true ||
      response?.status === true ||
      /\b(?:success(?:ful(?:ly)?)?|cancel(?:led|ed)?|true)\b/i.test(responseText);

    if (rejected) {
      throw createDelhiveryError(
        "DELHIVERY_CANCEL_FAILED",
        "Delhivery did not accept the cancellation request.",
        502,
        { providerMessage: responseText }
      );
    }
    if (!accepted) {
      const error = createDelhiveryError(
        "DELHIVERY_CANCEL_RESPONSE_INVALID",
        "Delhivery cancellation returned an unconfirmed response.",
        502,
        { providerMessage: responseText }
      );
      error.requestMayHaveReachedProvider = true;
      throw error;
    }

    order.delhivery = {
      ...(order.delhivery || {}),
      cancelStatus: "cancelled",
      cancelError: "",
      cancelledAt: new Date(),
    };
    await order.save();
    return {
      provider: DELHIVERY_PROVIDER_ID,
      skipped: false,
      cancelStatus: "cancelled",
    };
  } catch (error) {
    order.delhivery = {
      ...(order.delhivery || {}),
      cancelStatus: "failed",
      cancelError: sanitizeDelhiveryError(error),
    };
    await order.save();
    throw error;
  }
}

function normalizeStatus(rawStatus) {
  return cleanString(rawStatus)
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function mapStatusToOrderStatus(rawStatus, order) {
  const status = normalizeStatus(rawStatus);
  if (!status) return "";
  if (/\brto\b|return to origin|returned|reverse/.test(status)) return "";
  if (status === "delivered" || status.includes("shipment delivered")) {
    return "delivered";
  }
  if (status.includes("out for delivery") || status === "ofd") {
    return "out_for_delivery";
  }
  if (
    status === "shipped" ||
    status.includes("shipment shipped")
  ) {
    return "shipped";
  }
  if (
    status.includes("in transit") ||
    status.includes("dispatched") ||
    status.includes("bagged") ||
    status.includes("reached hub")
  ) {
    return "in_transit";
  }
  if (
    status === "picked" ||
    status.includes("picked up") ||
    status.includes("pickup complete")
  ) {
    return "processing";
  }
  if (
    status.includes("manifested") ||
    status.includes("shipment created") ||
    status.includes("ready to ship") ||
    status.includes("ready for pickup") ||
    status.includes("pickup scheduled") ||
    status.includes("not picked")
  ) {
    return "confirmed";
  }
  if (
    [status, order?.delhivery?.statusType].some(statusValueIndicatesCancellation) &&
    ["processing", "cancelled"].includes(order?.cancellation?.status)
  ) {
    return "cancelled";
  }
  return "";
}

export function applyStatusToOrder(order, rawStatus) {
  if (!order) return false;
  const mappedStatus = mapStatusToOrderStatus(rawStatus, order);
  if (!mappedStatus || order.orderStatus === mappedStatus) return false;
  if (["delivered", "cancelled"].includes(order.orderStatus)) return false;
  if (mappedStatus !== "cancelled") {
    const currentRank = ORDER_STATUS_RANK.get(order.orderStatus) ?? -1;
    const nextRank = ORDER_STATUS_RANK.get(mappedStatus) ?? -1;
    if (nextRank < currentRank) return false;
  }
  order.orderStatus = mappedStatus;
  return true;
}

function hasCancellationTarget(order) {
  return Boolean(cleanString(order?.delhivery?.waybill));
}

export const delhiveryProvider = {
  id: DELHIVERY_PROVIDER_ID,
  label: "Delhivery",
  checkServiceability,
  validateCheckoutServiceability,
  syncShipment,
  trackShipment,
  cancelShipment,
  hasCancellationTarget,
  mapStatusToOrderStatus,
  applyStatusToOrder,
};
