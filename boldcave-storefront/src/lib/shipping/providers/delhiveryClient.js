export const DELHIVERY_PROVIDER_ID = "delhivery";
export const DELHIVERY_PRODUCTION_BASE_URL = "https://track.delhivery.com";

const DEFAULT_TIMEOUT_MS = 15 * 1000;
const SAFE_DIAGNOSTIC_FIELDS = new Set([
  "code",
  "description",
  "err",
  "error",
  "errors",
  "message",
  "non_field_errors",
  "pickup_date",
  "pickup_location",
  "pickup_time",
  "expected_package_count",
  "reason",
  "remark",
  "remarks",
  "rmk",
  "status",
  "detail",
]);

function cleanString(value) {
  return String(value || "").trim();
}

export function createDelhiveryError(
  code,
  message,
  status = 503,
  details = undefined
) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  if (details) error.details = details;
  return error;
}

export function isDelhiveryApiEnabled() {
  return cleanString(process.env.DELHIVERY_API_ENABLED).toLowerCase() === "true";
}

export function assertDelhiveryApiEnabled() {
  if (!isDelhiveryApiEnabled()) {
    throw createDelhiveryError(
      "DELHIVERY_API_DISABLED",
      "Delhivery API is disabled.",
      503
    );
  }
}

function getApiToken() {
  const token = cleanString(process.env.DELHIVERY_API_TOKEN);
  if (!token) {
    throw createDelhiveryError(
      "DELHIVERY_TOKEN_REQUIRED",
      "Delhivery API token is not configured.",
      500
    );
  }
  return token;
}

function sanitizeDiagnosticValue(value) {
  const apiToken = cleanString(process.env.DELHIVERY_API_TOKEN);
  let sanitized = cleanString(value);
  if (apiToken) sanitized = sanitized.split(apiToken).join("[redacted-token]");

  return sanitized
    .replace(/\bAuthorization\s*[:=]\s*[^,;\s]+/gi, "Authorization=[redacted]")
    .replace(/\bToken\s+[^,;\s]+/gi, "Token [redacted]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b(?:\+?91[-\s]?)?[6-9]\d{9}\b/g, "[redacted-phone]")
    .replace(/\b\d{12,}\b/g, "[redacted-number]")
    .replace(/\s+/g, " ")
    .slice(0, 180);
}

function collectDiagnostics(value, fields, depth = 0, collectPrimitive = false) {
  if (!value || depth > 3) return;

  if (Array.isArray(value)) {
    value.slice(0, 5).forEach((entry) =>
      collectDiagnostics(entry, fields, depth + 1, collectPrimitive)
    );
    return;
  }

  if (typeof value !== "object") {
    if (collectPrimitive) {
      const sanitized = sanitizeDiagnosticValue(value);
      if (sanitized && !fields.includes(sanitized)) fields.push(sanitized);
    }
    return;
  }

  Object.entries(value).forEach(([key, entry]) => {
    const normalizedKey = String(key || "").toLowerCase();
    if (SAFE_DIAGNOSTIC_FIELDS.has(normalizedKey) && entry !== null) {
      if (typeof entry === "object") {
        collectDiagnostics(entry, fields, depth + 1, true);
      } else {
        const sanitized = sanitizeDiagnosticValue(entry);
        if (sanitized && !fields.includes(sanitized)) fields.push(sanitized);
      }
      return;
    }

    if (entry && typeof entry === "object") {
      collectDiagnostics(entry, fields, depth + 1, collectPrimitive);
    }
  });
}

export function getDelhiveryProviderMessage(payload, httpStatus) {
  const fields = [];
  collectDiagnostics(payload, fields);
  const prefix = Number.isFinite(Number(httpStatus))
    ? `HTTP ${Number(httpStatus)}`
    : "";
  return [prefix, ...fields].filter(Boolean).join("; ").slice(0, 300);
}

export function sanitizeDelhiveryError(error) {
  return cleanString(
    error?.details?.providerMessage || error?.message || "Delhivery request failed"
  ).slice(0, 300);
}

async function parseResponseSafely(response, captureResponseDiagnostic = false) {
  const text = await response.text();
  const responseMeta = {
    responseBodyEmpty: text.length === 0,
    responseBodyLength: text.length,
    responseContentType: sanitizeDiagnosticValue(
      response.headers.get("content-type") || ""
    ),
    providerRequestId: sanitizeDiagnosticValue(
      response.headers.get("x-request-id") ||
        response.headers.get("x-correlation-id") ||
        ""
    ),
    responseDiagnostic: captureResponseDiagnostic
      ? sanitizeDiagnosticValue(text)
      : "",
  };
  if (!text) return { payload: null, responseMeta };

  try {
    return { payload: JSON.parse(text), responseMeta };
  } catch {
    return {
      payload: { message: sanitizeDiagnosticValue(text) },
      responseMeta,
    };
  }
}

export async function delhiveryRequest(
  path,
  {
    method = "GET",
    body,
    headers: additionalHeaders = {},
    mutating = method !== "GET",
    timeoutMs = DEFAULT_TIMEOUT_MS,
    captureResponseDiagnostic = false,
  } = {}
) {
  assertDelhiveryApiEnabled();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const headers = {
    Accept: "application/json",
    ...additionalHeaders,
    Authorization: `Token ${getApiToken()}`,
  };

  const options = {
    method,
    headers,
    signal: controller.signal,
  };

  if (body !== undefined) options.body = body;

  let response;
  try {
    response = await fetch(`${DELHIVERY_PRODUCTION_BASE_URL}${path}`, options);
  } catch (cause) {
    const timedOut = cause?.name === "AbortError";
    const error = createDelhiveryError(
      timedOut ? "DELHIVERY_TIMEOUT" : "DELHIVERY_NETWORK_ERROR",
      timedOut
        ? "Delhivery request timed out."
        : "Delhivery request failed before a response was received.",
      503
    );
    error.requestMayHaveReachedProvider = Boolean(mutating);
    error.cause = cause;
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const { payload, responseMeta } = await parseResponseSafely(
    response,
    captureResponseDiagnostic
  );
  const providerMessage = [
    getDelhiveryProviderMessage(payload, response.status),
    responseMeta.responseDiagnostic,
    responseMeta.responseBodyEmpty
      ? "Delhivery returned an empty response body."
      : "",
  ]
    .filter(Boolean)
    .join("; ")
    .slice(0, 300);

  if (response.status === 401 || response.status === 403) {
    throw createDelhiveryError(
      "DELHIVERY_AUTH_ERROR",
      "Delhivery authentication failed.",
      response.status,
      { providerMessage, httpStatus: response.status, ...responseMeta }
    );
  }

  if (response.status === 429) {
    throw createDelhiveryError(
      "DELHIVERY_RATE_LIMITED",
      "Delhivery rate limit reached.",
      429,
      { providerMessage, httpStatus: response.status, ...responseMeta }
    );
  }

  if (!response.ok) {
    const error = createDelhiveryError(
      "DELHIVERY_REQUEST_FAILED",
      "Delhivery request failed.",
      response.status,
      { providerMessage, httpStatus: response.status, ...responseMeta }
    );
    error.requestMayHaveReachedProvider = Boolean(mutating && response.status >= 500);
    throw error;
  }

  return payload;
}
