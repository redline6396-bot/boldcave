import Order from "@/models/Order";
import DelhiveryPickupRecord from "@/models/DelhiveryPickupRecord";
import StoreSettings from "@/models/StoreSettings";
import { getStoreSettings } from "@/lib/storeSettings";
import {
  createDelhiveryError,
  delhiveryRequest,
  getDelhiveryProviderMessage,
  sanitizeDelhiveryError,
} from "@/lib/shipping/providers/delhiveryClient";

const TIME_ZONE = "Asia/Kolkata";
const DEFAULT_PICKUP_TIME = "14:00:00";
const GLOBAL_SETTINGS_KEY = "global";

function cleanString(value) {
  return String(value || "").trim();
}

function getPickupLocation() {
  const value = cleanString(process.env.DELHIVERY_PICKUP_LOCATION);
  if (!value) {
    throw createDelhiveryError(
      "DELHIVERY_PICKUP_LOCATION_REQUIRED",
      "Delhivery pickup location is not configured.",
      500
    );
  }
  return value;
}

function getPickupTime() {
  const value = cleanString(process.env.DELHIVERY_PICKUP_TIME || DEFAULT_PICKUP_TIME);
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(value)) {
    throw createDelhiveryError(
      "DELHIVERY_PICKUP_TIME_INVALID",
      "Delhivery pickup time must use HH:mm:ss format.",
      500
    );
  }
  return value;
}

function indiaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
    weekday: get("weekday"),
  };
}

function dateKey({ year, month, day }) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function nextCalendarDay(parts) {
  const utcDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1, 12));
  return {
    year: utcDate.getUTCFullYear(),
    month: utcDate.getUTCMonth() + 1,
    day: utcDate.getUTCDate(),
    weekday: new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "short",
    }).format(utcDate),
  };
}

function addCalendarDays(parts, days) {
  const utcDate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + days, 12)
  );
  return {
    year: utcDate.getUTCFullYear(),
    month: utcDate.getUTCMonth() + 1,
    day: utcDate.getUTCDate(),
    weekday: new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "short",
    }).format(utcDate),
  };
}

function parsePickupDate(value) {
  const normalized = cleanString(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!match) return null;

  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  const utcDate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, 12)
  );
  if (
    utcDate.getUTCFullYear() !== parts.year ||
    utcDate.getUTCMonth() + 1 !== parts.month ||
    utcDate.getUTCDate() !== parts.day
  ) {
    return null;
  }

  return {
    ...parts,
    weekday: new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "short",
    }).format(utcDate),
  };
}

export function getDelhiveryPickupTarget(now = new Date()) {
  const pickupTime = getPickupTime();
  const current = indiaParts(now);
  const [pickupHour, pickupMinute, pickupSecond] = pickupTime.split(":").map(Number);
  const currentSeconds = current.hour * 3600 + current.minute * 60 + current.second;
  const pickupSeconds = pickupHour * 3600 + pickupMinute * 60 + pickupSecond;
  let target = current;

  if (current.weekday === "Sun" || currentSeconds > pickupSeconds) {
    target = nextCalendarDay(current);
  }
  if (target.weekday === "Sun") target = nextCalendarDay(target);

  return { pickupDate: dateKey(target), pickupTime };
}

export function getDelhiveryPickupDateOptions(now = new Date()) {
  const current = indiaParts(now);
  const { pickupDate } = getDelhiveryPickupTarget(now);
  return {
    suggestedPickupDate: pickupDate,
    pickupDateMin: pickupDate,
    pickupDateMax: dateKey(addCalendarDays(current, 7)),
  };
}

function resolvePickupDate(requestedPickupDate, now = new Date()) {
  const options = getDelhiveryPickupDateOptions(now);
  const requested = cleanString(requestedPickupDate);
  if (!requested) return options.suggestedPickupDate;

  const parsed = parsePickupDate(requested);
  if (!parsed) {
    throw createDelhiveryError(
      "DELHIVERY_PICKUP_DATE_INVALID",
      "Pickup date must use YYYY-MM-DD format.",
      400
    );
  }
  if (parsed.weekday === "Sun") {
    throw createDelhiveryError(
      "DELHIVERY_PICKUP_DATE_INVALID",
      "Delhivery pickup cannot be scheduled on Sunday.",
      400
    );
  }
  if (requested < options.pickupDateMin) {
    throw createDelhiveryError(
      "DELHIVERY_PICKUP_DATE_INVALID",
      `Pickup date cannot be earlier than ${options.pickupDateMin}.`,
      400
    );
  }
  if (requested > options.pickupDateMax) {
    throw createDelhiveryError(
      "DELHIVERY_PICKUP_DATE_INVALID",
      `Pickup date cannot be later than ${options.pickupDateMax}.`,
      400
    );
  }

  return requested;
}

export function serializeDelhiveryPickupSettings(settings) {
  const pickup = settings?.delhiveryPickup || {};
  const pickupDateOptions = getDelhiveryPickupDateOptions();
  return {
    autoPickupEnabled: pickup.autoPickupEnabled === true,
    state: pickup.state || "idle",
    requestDate: pickup.requestDate || "",
    pickupId: pickup.pickupId || "",
    requestedAt: pickup.requestedAt || null,
    expectedPackageCount: Number(pickup.expectedPackageCount) || 0,
    lastError: pickup.lastError || "",
    requestStartedAt: pickup.requestStartedAt || null,
    cancelledAt: pickup.cancelledAt || null,
    pickupLocation: cleanString(process.env.DELHIVERY_PICKUP_LOCATION),
    pickupTime: getPickupTime(),
    timeZone: TIME_ZONE,
    statusSource:
      pickup.state === "cancelled"
        ? "admin_confirmed_provider_action"
        : "local_snapshot",
    ...pickupDateOptions,
  };
}

export async function getDelhiveryPickupSettings() {
  const settings = await getStoreSettings();
  return {
    ...serializeDelhiveryPickupSettings(settings),
    currentReadyPackageCount: await countReadyShipments(),
  };
}

export async function setDelhiveryAutoPickupEnabled(enabled) {
  await getStoreSettings();
  const settings = await StoreSettings.findOneAndUpdate(
    { key: GLOBAL_SETTINGS_KEY },
    { $set: { "delhiveryPickup.autoPickupEnabled": enabled === true } },
    { returnDocument: "after" }
  );
  return {
    ...serializeDelhiveryPickupSettings(settings),
    currentReadyPackageCount: await countReadyShipments(),
  };
}

async function countReadyShipments() {
  return Order.countDocuments(getReadyShipmentFilter());
}

function getReadyShipmentFilter() {
  return {
    shippingProvider: "delhivery",
    "delhivery.waybill": { $exists: true, $nin: [null, ""] },
    "delhivery.syncStatus": "created",
    "delhivery.pickupState": { $ne: "scheduled" },
    orderStatus: { $in: ["shipping_pending", "confirmed", "processing"] },
  };
}

function serializePickupOrder(order) {
  const value = typeof order?.toObject === "function" ? order.toObject() : order;
  const orderId = value?.order || value?._id;
  return {
    order: orderId,
    orderId: cleanString(orderId),
    orderNumber: value?.orderNumber || "",
    waybill: value?.delhivery?.waybill || "",
    orderStatus: value?.orderStatus || "",
    paymentMethod: value?.payment?.method || "",
    finalAmount: Number(value?.amounts?.finalAmount) || 0,
    customerName: [value?.customer?.firstName, value?.customer?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim(),
    orderedAt: value?.createdAt || null,
    pickupId: value?.delhivery?.pickupId || "",
    pickupState: value?.delhivery?.pickupState || "",
  };
}

async function getReadyShipmentOrders() {
  const orders = await Order.find(getReadyShipmentFilter()).sort({ createdAt: 1 });
  return orders.map(serializePickupOrder);
}

function serializePickupRecord(record) {
  const value = typeof record?.toObject === "function" ? record.toObject() : record;
  return {
    id: cleanString(value?._id),
    provider: value?.provider || "delhivery",
    pickupId: value?.pickupId || "",
    state: value?.state || "",
    source: value?.source || "manual",
    requestDate: value?.requestDate || "",
    pickupTime: value?.pickupTime || "",
    pickupLocation: value?.pickupLocation || "",
    expectedPackageCount: Number(value?.expectedPackageCount) || 0,
    providerHttpStatus: Number.isFinite(Number(value?.providerHttpStatus))
      ? Number(value.providerHttpStatus)
      : null,
    lastError: value?.lastError || "",
    statusSource: value?.statusSource || "local_snapshot",
    requestedAt: value?.requestedAt || null,
    cancelledAt: value?.cancelledAt || null,
    orders: Array.isArray(value?.orders)
      ? value.orders.map(serializePickupOrder)
      : [],
    events: Array.isArray(value?.events)
      ? value.events.map((event) => ({
          type: event?.type || "",
          message: event?.message || "",
          at: event?.at || null,
        }))
      : [],
    createdAt: value?.createdAt || null,
    updatedAt: value?.updatedAt || null,
  };
}

async function createPickupHistoryRecord(values) {
  try {
    return await DelhiveryPickupRecord.create(values);
  } catch (error) {
    console.error("Unable to create Delhivery pickup history", {
      name: error?.name,
      message: cleanString(error?.message).slice(0, 160),
    });
    return null;
  }
}

async function updatePickupHistoryRecord(record, update) {
  if (!record?._id) return;
  try {
    await DelhiveryPickupRecord.updateOne({ _id: record._id }, update);
  } catch (error) {
    console.error("Unable to update Delhivery pickup history", {
      name: error?.name,
      message: cleanString(error?.message).slice(0, 160),
    });
  }
}

async function recordConfirmedPickupCancellation(settings, pickupId, addEvent) {
  const pickup = settings?.delhiveryPickup || {};
  const cancelledAt = pickup.cancelledAt || new Date();
  const existing = await DelhiveryPickupRecord.findOne({ pickupId });
  if (existing) {
    const update = {
      $set: {
        state: "cancelled",
        cancelledAt,
        lastError: "",
        statusSource: "admin_confirmed_provider_action",
      },
    };
    if (addEvent) {
      update.$push = {
        events: {
          type: "cancellation_confirmed",
          message: "Provider cancellation confirmed by an administrator.",
          at: cancelledAt,
        },
      };
    }
    await DelhiveryPickupRecord.updateOne({ _id: existing._id }, update);
    return;
  }

  await createPickupHistoryRecord({
    pickupId,
    state: "cancelled",
    source: "legacy_snapshot",
    requestDate: pickup.requestDate || "",
    pickupTime: getPickupTime(),
    pickupLocation: cleanString(process.env.DELHIVERY_PICKUP_LOCATION),
    expectedPackageCount: Number(pickup.expectedPackageCount) || 0,
    requestedAt: pickup.requestedAt || null,
    cancelledAt,
    statusSource: "admin_confirmed_provider_action",
    events: [
      {
        type: "cancellation_confirmed",
        message: "Provider cancellation confirmed by an administrator.",
        at: cancelledAt,
      },
    ],
  });
}

async function markPickupOrdersCancelled(pickupId, cancelledAt) {
  try {
    await Order.updateMany(
      { "delhivery.pickupId": pickupId },
      {
        $set: {
          "delhivery.pickupState": "cancelled",
          "delhivery.pickupCancelledAt": cancelledAt,
        },
      }
    );
  } catch (error) {
    console.error("Unable to update pickup state on Delhivery orders", {
      name: error?.name,
      message: cleanString(error?.message).slice(0, 160),
    });
  }
}

export async function getDelhiveryPickupHistory({ limit = 100, state = "" } = {}) {
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 100));
  const filter = {};
  const normalizedState = cleanString(state);
  if (normalizedState) filter.state = normalizedState;

  const [records, storedTotal, settings, readyOrders] = await Promise.all([
    DelhiveryPickupRecord.find(filter).sort({ createdAt: -1 }).limit(safeLimit),
    DelhiveryPickupRecord.countDocuments(filter),
    getStoreSettings(),
    getReadyShipmentOrders(),
  ]);
  const pickups = records.map(serializePickupRecord);
  const current = settings?.delhiveryPickup || {};
  const currentPickupId = cleanString(current.pickupId);
  const includeCurrent =
    currentPickupId &&
    (!normalizedState || current.state === normalizedState) &&
    !pickups.some((pickup) => pickup.pickupId === currentPickupId);
  if (includeCurrent) {
    pickups.unshift({
      id: `current-${currentPickupId}`,
      provider: "delhivery",
      pickupId: currentPickupId,
      state: current.state || "",
      source: "legacy_snapshot",
      requestDate: current.requestDate || "",
      pickupTime: getPickupTime(),
      pickupLocation: cleanString(process.env.DELHIVERY_PICKUP_LOCATION),
      expectedPackageCount: Number(current.expectedPackageCount) || 0,
      providerHttpStatus: null,
      lastError: current.lastError || "",
      statusSource:
        current.state === "cancelled"
          ? "admin_confirmed_provider_action"
          : "local_snapshot",
      requestedAt: current.requestedAt || null,
      cancelledAt: current.cancelledAt || null,
      orders: [],
      events: [
        {
          type: "existing_pickup",
          message: "Pickup created before detailed pickup history was enabled.",
          at: current.requestedAt || current.cancelledAt || null,
        },
      ],
      createdAt: current.requestedAt || current.cancelledAt || null,
      updatedAt: current.cancelledAt || current.requestedAt || null,
    });
  }
  return {
    pickups,
    total: storedTotal + (includeCurrent ? 1 : 0),
    readyOrders,
  };
}

async function archiveCurrentPickupSnapshot(settings) {
  const pickup = settings?.delhiveryPickup || {};
  const pickupId = cleanString(pickup.pickupId);
  if (!pickupId) return;
  try {
    const exists = await DelhiveryPickupRecord.exists({ pickupId });
    if (exists) return;
    await DelhiveryPickupRecord.create({
      pickupId,
      state: pickup.state || "cancelled",
      source: "legacy_snapshot",
      requestDate: pickup.requestDate || "",
      pickupTime: getPickupTime(),
      pickupLocation: cleanString(process.env.DELHIVERY_PICKUP_LOCATION),
      expectedPackageCount: Number(pickup.expectedPackageCount) || 0,
      requestedAt: pickup.requestedAt || null,
      cancelledAt: pickup.cancelledAt || null,
      lastError: pickup.lastError || "",
      statusSource:
        pickup.state === "cancelled"
          ? "admin_confirmed_provider_action"
          : "local_snapshot",
      events: [
        {
          type: "legacy_snapshot_archived",
          message: "Previous pickup archived before a new pickup request.",
          at: new Date(),
        },
      ],
    });
  } catch (error) {
    console.error("Unable to archive existing Delhivery pickup", {
      name: error?.name,
      message: cleanString(error?.message).slice(0, 160),
    });
  }
}

export async function confirmDelhiveryPickupCancelled({
  pickupId,
  confirmedProviderCancellation = false,
} = {}) {
  const normalizedPickupId = cleanString(pickupId);
  if (!confirmedProviderCancellation) {
    throw createDelhiveryError(
      "DELHIVERY_PICKUP_CANCELLATION_CONFIRMATION_REQUIRED",
      "Confirm that the pickup was cancelled in Delhivery One.",
      400
    );
  }
  if (!normalizedPickupId) {
    throw createDelhiveryError(
      "DELHIVERY_PICKUP_ID_REQUIRED",
      "Pickup ID is required.",
      400
    );
  }

  const existingSettings = await getStoreSettings();
  const pickup = existingSettings?.delhiveryPickup || {};
  if (
    pickup.state === "cancelled" &&
    cleanString(pickup.pickupId) === normalizedPickupId
  ) {
    await markPickupOrdersCancelled(
      normalizedPickupId,
      pickup.cancelledAt || new Date()
    );
    await recordConfirmedPickupCancellation(
      existingSettings,
      normalizedPickupId,
      false
    ).catch((error) => {
      console.error("Unable to reconcile Delhivery pickup history", {
        name: error?.name,
        message: cleanString(error?.message).slice(0, 160),
      });
    });
    return {
      ok: true,
      alreadyConfirmed: true,
      settings: {
        ...serializeDelhiveryPickupSettings(existingSettings),
        currentReadyPackageCount: await countReadyShipments(),
      },
    };
  }
  if (
    pickup.state !== "scheduled" ||
    cleanString(pickup.pickupId) !== normalizedPickupId
  ) {
    throw createDelhiveryError(
      "DELHIVERY_PICKUP_CANCELLATION_CONFLICT",
      "The scheduled pickup changed. Refresh the page before confirming cancellation.",
      409
    );
  }

  const cancelled = await StoreSettings.findOneAndUpdate(
    {
      key: GLOBAL_SETTINGS_KEY,
      "delhiveryPickup.state": "scheduled",
      "delhiveryPickup.pickupId": normalizedPickupId,
    },
    {
      $set: {
        "delhiveryPickup.state": "cancelled",
        "delhiveryPickup.cancelledAt": new Date(),
        "delhiveryPickup.lastError": "",
      },
      $unset: { "delhiveryPickup.requestStartedAt": "" },
    },
    { returnDocument: "after" }
  );
  if (!cancelled) {
    throw createDelhiveryError(
      "DELHIVERY_PICKUP_CANCELLATION_CONFLICT",
      "The scheduled pickup changed. Refresh the page before confirming cancellation.",
      409
    );
  }

  await markPickupOrdersCancelled(
    normalizedPickupId,
    cancelled.delhiveryPickup?.cancelledAt || new Date()
  );

  await recordConfirmedPickupCancellation(
    cancelled,
    normalizedPickupId,
    true
  ).catch((error) => {
    console.error("Unable to reconcile Delhivery pickup history", {
      name: error?.name,
      message: cleanString(error?.message).slice(0, 160),
    });
  });

  return {
    ok: true,
    alreadyConfirmed: false,
    settings: {
      ...serializeDelhiveryPickupSettings(cancelled),
      currentReadyPackageCount: await countReadyShipments(),
    },
  };
}

function pickupMayBePartiallySaved(error) {
  const message = [error?.details?.providerMessage, error?.message]
    .filter(Boolean)
    .join(" ");
  return /partial(?:ly)?\s+save|may have been saved|already (?:scheduled|exists)|existing pickup|pickup[^.;]*exists|duplicate/i.test(message);
}

function getPickupStoredError(error) {
  const sanitized = sanitizeDelhiveryError(error);
  if (Number(error?.status) === 400 && error?.details?.responseBodyEmpty === true) {
    return `${sanitized} Check Delhivery One for an existing pickup or account-level auto pickup before retrying.`.slice(
      0,
      300
    );
  }
  return sanitized;
}

function getPickupId(payload) {
  return cleanString(
    payload?.pickup_id ||
      payload?.pickupId ||
      payload?.pickup_request_id ||
      payload?.pickupRequestId ||
      payload?.pr_id ||
      payload?.request_id ||
      payload?.requestId ||
      payload?.data?.pickup_id ||
      payload?.data?.pickupId ||
      payload?.data?.pickup_request_id ||
      payload?.data?.pickupRequestId ||
      payload?.data?.pr_id ||
      payload?.data?.request_id ||
      payload?.data?.requestId
  );
}

function getPickupDiagnosticContext({
  pickupDate,
  pickupTime,
  pickupLocation,
  expectedPackageCount,
}) {
  return {
    pickupDate,
    pickupTime,
    pickupLocation,
    expectedPackageCount,
  };
}

export async function ensureDelhiveryPickupScheduled({
  automatic = false,
  requestedPickupDate = "",
} = {}) {
  const existingSettings = await getStoreSettings();
  if (automatic && existingSettings?.delhiveryPickup?.autoPickupEnabled !== true) {
    return {
      ok: true,
      skipped: true,
      reason: "automatic_pickup_disabled",
      settings: serializeDelhiveryPickupSettings(existingSettings),
    };
  }

  const now = new Date();
  const pickupTime = getPickupTime();
  const pickupDate = automatic
    ? getDelhiveryPickupTarget(now).pickupDate
    : resolvePickupDate(requestedPickupDate, now);
  await archiveCurrentPickupSnapshot(existingSettings);
  if (
    automatic &&
    existingSettings?.delhiveryPickup?.requestDate === pickupDate &&
    existingSettings?.delhiveryPickup?.state === "failed"
  ) {
    return {
      ok: false,
      skipped: true,
      reason: "automatic_retry_blocked_after_failure",
      error: existingSettings.delhiveryPickup.lastError || "Pickup request failed.",
      settings: serializeDelhiveryPickupSettings(existingSettings),
    };
  }

  const claimedSettings = await StoreSettings.findOneAndUpdate(
    {
      key: GLOBAL_SETTINGS_KEY,
      $or: [
        { "delhiveryPickup.requestDate": { $ne: pickupDate } },
        {
          "delhiveryPickup.state": {
            $nin: ["requesting", "scheduled", "needs_reconciliation"],
          },
        },
      ],
    },
    {
      $set: {
        "delhiveryPickup.state": "requesting",
        "delhiveryPickup.requestDate": pickupDate,
        "delhiveryPickup.requestStartedAt": now,
        "delhiveryPickup.lastError": "",
      },
      $unset: {
        "delhiveryPickup.pickupId": "",
        "delhiveryPickup.requestedAt": "",
        "delhiveryPickup.cancelledAt": "",
      },
    },
    { returnDocument: "after" }
  );

  if (!claimedSettings) {
    const latest = await getStoreSettings();
    return {
      ok: latest?.delhiveryPickup?.state === "scheduled",
      skipped: true,
      inProgress: latest?.delhiveryPickup?.state === "requesting",
      needsReconciliation:
        latest?.delhiveryPickup?.state === "needs_reconciliation",
      reason: "pickup_already_claimed",
      settings: serializeDelhiveryPickupSettings(latest),
    };
  }

  const readyOrders = await getReadyShipmentOrders();
  const expectedPackageCount = readyOrders.length;
  if (expectedPackageCount <= 0) {
    await createPickupHistoryRecord({
      state: "no_ready_shipments",
      source: automatic ? "automatic" : "manual",
      requestDate: pickupDate,
      pickupTime,
      pickupLocation: cleanString(process.env.DELHIVERY_PICKUP_LOCATION),
      expectedPackageCount: 0,
      lastError: "No ready Delhivery shipments were found.",
      events: [
        {
          type: "request_skipped",
          message: "No ready Delhivery shipments were found.",
          at: new Date(),
        },
      ],
    });
    const noShipments = await StoreSettings.findOneAndUpdate(
      { key: GLOBAL_SETTINGS_KEY, "delhiveryPickup.state": "requesting" },
      {
        $set: {
          "delhiveryPickup.state": "idle",
          "delhiveryPickup.expectedPackageCount": 0,
          "delhiveryPickup.lastError": "No ready Delhivery shipments were found.",
        },
        $unset: { "delhiveryPickup.requestStartedAt": "" },
      },
      { returnDocument: "after" }
    );
    return {
      ok: false,
      skipped: true,
      reason: "no_ready_shipments",
      error: "No ready Delhivery shipments were found.",
      settings: serializeDelhiveryPickupSettings(noShipments),
    };
  }

  const pickupLocation = getPickupLocation();
  const diagnosticContext = getPickupDiagnosticContext({
    pickupDate,
    pickupTime,
    pickupLocation,
    expectedPackageCount,
  });
  const historyRecord = await createPickupHistoryRecord({
    state: "requesting",
    source: automatic ? "automatic" : "manual",
    requestDate: pickupDate,
    pickupTime,
    pickupLocation,
    expectedPackageCount,
    orders: readyOrders,
    events: [
      {
        type: "request_started",
        message: "Pickup request started.",
        at: new Date(),
      },
    ],
  });

  try {
    console.info("Delhivery pickup request diagnostic", diagnosticContext);
    const response = await delhiveryRequest("/fm/request/new/", {
      method: "POST",
      body: JSON.stringify({
        pickup_time: pickupTime,
        pickup_date: pickupDate,
        pickup_location: pickupLocation,
        expected_package_count: expectedPackageCount,
      }),
      headers: { "Content-Type": "application/json" },
      mutating: true,
      captureResponseDiagnostic: true,
    });
    const pickupId = getPickupId(response);
    const providerMessage = getDelhiveryProviderMessage(response);
    console.info("Delhivery pickup response diagnostic", {
      ...diagnosticContext,
      httpStatus: 200,
      pickupIdPresent: Boolean(pickupId),
      providerMessage,
    });
    const rejected =
      response?.success === false ||
      response?.status === false ||
      /fail|error|invalid/i.test(providerMessage);
    if (rejected) {
      const error = createDelhiveryError(
        "DELHIVERY_PICKUP_FAILED",
        "Delhivery rejected the pickup request.",
        502,
        { providerMessage }
      );
      // A pickup id on a contradictory response means the provider may have
      // accepted the request. Reconciliation is safer than a duplicate retry.
      if (pickupId) error.requestMayHaveReachedProvider = true;
      throw error;
    }
    if (!pickupId) {
      const error = createDelhiveryError(
        "DELHIVERY_PICKUP_RESPONSE_INVALID",
        "Delhivery pickup response did not include a pickup ID.",
        502,
        { providerMessage }
      );
      error.requestMayHaveReachedProvider = true;
      throw error;
    }

    const requestedAt = new Date();
    const scheduled = await StoreSettings.findOneAndUpdate(
      {
        key: GLOBAL_SETTINGS_KEY,
        "delhiveryPickup.state": "requesting",
        "delhiveryPickup.requestDate": pickupDate,
      },
      {
        $set: {
          "delhiveryPickup.state": "scheduled",
          "delhiveryPickup.pickupId": pickupId,
          "delhiveryPickup.requestedAt": requestedAt,
          "delhiveryPickup.expectedPackageCount": expectedPackageCount,
          "delhiveryPickup.lastError": "",
        },
        $unset: { "delhiveryPickup.requestStartedAt": "" },
      },
      { returnDocument: "after" }
    );
    await updatePickupHistoryRecord(historyRecord, {
      $set: {
        state: "scheduled",
        pickupId,
        requestedAt,
        providerHttpStatus: 200,
        lastError: "",
      },
      $push: {
        events: {
          type: "scheduled",
          message: "Delhivery accepted the pickup request.",
          at: requestedAt,
        },
      },
    });
    const readyOrderIds = readyOrders.map((order) => order.order).filter(Boolean);
    if (readyOrderIds.length) {
      try {
        await Order.updateMany(
          {
            ...getReadyShipmentFilter(),
            _id: { $in: readyOrderIds },
          },
          {
            $set: {
              "delhivery.pickupId": pickupId,
              "delhivery.pickupState": "scheduled",
              "delhivery.pickupRequestDate": pickupDate,
              "delhivery.pickupRequestedAt": requestedAt,
            },
            $unset: { "delhivery.pickupCancelledAt": "" },
          }
        );
      } catch (orderUpdateError) {
        console.error("Unable to attach Delhivery pickup ID to orders", {
          name: orderUpdateError?.name,
          message: cleanString(orderUpdateError?.message).slice(0, 160),
        });
      }
    }
    return {
      ok: true,
      skipped: false,
      pickupId,
      settings: serializeDelhiveryPickupSettings(scheduled),
    };
  } catch (error) {
    const sanitizedError = getPickupStoredError(error);
    console.error("Delhivery pickup failure diagnostic", {
      ...diagnosticContext,
      httpStatus: Number.isFinite(Number(error?.status))
        ? Number(error.status)
        : null,
      errorCode: cleanString(error?.code),
      providerMessage: sanitizedError,
      responseBodyEmpty: error?.details?.responseBodyEmpty === true,
      responseBodyLength: Number(error?.details?.responseBodyLength) || 0,
      responseContentType: cleanString(error?.details?.responseContentType),
      responseDiagnostic: cleanString(error?.details?.responseDiagnostic),
      providerRequestId: cleanString(error?.details?.providerRequestId),
    });
    const emptyBadRequest =
      Number(error?.status) === 400 && error?.details?.responseBodyEmpty === true;
    const needsReconciliation =
      Boolean(error?.requestMayHaveReachedProvider) ||
      emptyBadRequest ||
      pickupMayBePartiallySaved(error);
    const state = needsReconciliation ? "needs_reconciliation" : "failed";
    const failed = await StoreSettings.findOneAndUpdate(
      {
        key: GLOBAL_SETTINGS_KEY,
        "delhiveryPickup.requestDate": pickupDate,
      },
      {
        $set: {
          "delhiveryPickup.state": state,
          "delhiveryPickup.expectedPackageCount": expectedPackageCount,
          "delhiveryPickup.lastError": sanitizedError,
        },
        $unset: { "delhiveryPickup.requestStartedAt": "" },
      },
      { returnDocument: "after" }
    );
    await updatePickupHistoryRecord(historyRecord, {
      $set: {
        state,
        providerHttpStatus: Number.isFinite(Number(error?.status))
          ? Number(error.status)
          : null,
        lastError: sanitizedError,
      },
      $push: {
        events: {
          type: state,
          message: sanitizedError,
          at: new Date(),
        },
      },
    });
    return {
      ok: false,
      skipped: false,
      needsReconciliation,
      providerHttpStatus: Number.isFinite(Number(error?.status))
        ? Number(error.status)
        : null,
      providerResponseBodyEmpty: error?.details?.responseBodyEmpty === true,
      error: sanitizedError,
      settings: serializeDelhiveryPickupSettings(failed),
    };
  }
}
