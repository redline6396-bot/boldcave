import crypto from "node:crypto";
import Razorpay from "razorpay";

let instance = null;
const RAZORPAY_API_BASE_URL = "https://api.razorpay.com/v1";
const REFUND_TIMEOUT_MS = 15000;

export class RazorpayApiError extends Error {
  constructor(message = "Razorpay request failed", details = {}) {
    super(message);
    this.name = "RazorpayApiError";
    this.code = details.code || "RAZORPAY_API_FAILED";
    this.status = details.status || 502;
    this.details = details;
  }
}

export class RazorpayRefundError extends RazorpayApiError {
  constructor(message = "Razorpay refund failed", details = {}) {
    super(message, { ...details, code: "RAZORPAY_REFUND_FAILED" });
    this.name = "RazorpayRefundError";
  }
}

export function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured");
  }

  if (!instance) {
    instance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  return instance;
}

function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured");
  }

  return { keyId, keySecret };
}

function getBasicAuthHeader() {
  const { keyId, keySecret } = getRazorpayCredentials();
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

function parseRazorpayJson(text) {
  if (!text?.trim()) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function sanitizeRazorpayError(body, fallback) {
  const error = body?.error || body;
  return String(
    error?.description ||
      error?.reason ||
      error?.message ||
      fallback ||
      "Razorpay refund failed"
  ).slice(0, 300);
}

async function razorpayRest(
  path,
  { method = "GET", headers = {}, body, errorClass = RazorpayApiError } = {}
) {
  const controller = new globalThis.AbortController();
  const timeout = setTimeout(() => controller.abort(), REFUND_TIMEOUT_MS);

  try {
    const response = await fetch(`${RAZORPAY_API_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: getBasicAuthHeader(),
        "Content-Type": "application/json",
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    const text = await response.text();
    const data = parseRazorpayJson(text);

    if (!response.ok) {
      throw new errorClass(sanitizeRazorpayError(data, response.statusText), {
        status: response.status,
        razorpayStatus: response.status,
        razorpayCode: data?.error?.code || "",
      });
    }

    return data;
  } catch (error) {
    if (error instanceof RazorpayApiError) {
      throw error;
    }

    throw new errorClass("Razorpay request could not be completed.", {
      status: 502,
      networkError: true,
      name: error?.name,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function getRefundAmountPaise(order) {
  return Math.round(Number(order?.amounts?.finalAmount || 0) * 100);
}

export function getRefundIdempotencyKey(order) {
  const source = String(order?.orderNumber || order?._id || "").trim();
  const safeSource = source.replace(/[^a-zA-Z0-9_-]/g, "-");
  const key = `refund-${safeSource}`.replace(/-+/g, "-").slice(0, 60);
  return key.length >= 10 ? key : `refund-order-${String(order?._id || "unknown")}`;
}

export function buildFullRefundRequest({ order, amountPaise, idempotencyKey }) {
  return {
    amount: amountPaise,
    speed: "normal",
    receipt: idempotencyKey,
    notes: {
      orderNumber: order.orderNumber,
      orderId: String(order._id),
    },
  };
}

export async function createRazorpayRefund({
  razorpayPaymentId,
  amountPaise,
  idempotencyKey,
  body,
}) {
  if (!razorpayPaymentId) {
    throw new RazorpayRefundError("Razorpay payment ID is missing", { status: 400 });
  }

  if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
    throw new RazorpayRefundError("Refund amount is invalid", { status: 400 });
  }

  if (!/^[a-zA-Z0-9_-]{10,}$/.test(idempotencyKey || "")) {
    throw new RazorpayRefundError("Refund idempotency key is invalid", { status: 400 });
  }

  return razorpayRest(
    `/payments/${encodeURIComponent(razorpayPaymentId)}/refund`,
    {
      method: "POST",
      headers: {
        "X-Refund-Idempotency": idempotencyKey,
      },
      body,
      errorClass: RazorpayRefundError,
    }
  );
}

export async function createRazorpayFullRefund(options) {
  return createRazorpayRefund(options);
}

export async function fetchRazorpayPaymentRefunds(razorpayPaymentId) {
  if (!razorpayPaymentId) {
    throw new RazorpayRefundError("Razorpay payment ID is missing", { status: 400 });
  }

  return razorpayRest(
    `/payments/${encodeURIComponent(razorpayPaymentId)}/refunds?count=100`,
    { errorClass: RazorpayRefundError }
  );
}

export async function fetchRazorpayRefund({ razorpayPaymentId, refundId }) {
  if (!razorpayPaymentId || !refundId) {
    throw new RazorpayRefundError("Razorpay refund lookup is invalid", { status: 400 });
  }

  return razorpayRest(
    `/payments/${encodeURIComponent(razorpayPaymentId)}/refunds/${encodeURIComponent(refundId)}`,
    { errorClass: RazorpayRefundError }
  );
}

export async function fetchRazorpayPayment(razorpayPaymentId) {
  if (!razorpayPaymentId) {
    throw new RazorpayApiError("Razorpay payment ID is missing", { status: 400 });
  }

  return razorpayRest(`/payments/${encodeURIComponent(razorpayPaymentId)}`);
}

export async function createRazorpayOrder({ amount, receipt, notes = {} }) {
  const razorpay = getRazorpayInstance();
  return razorpay.orders.create({
    amount: Math.round(Number(amount) * 100),
    currency: "INR",
    receipt,
    notes,
  });
}

export function verifyRazorpaySignature({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) {
  const secret = process.env.RAZORPAY_KEY_SECRET;

  if (!secret) {
    throw new Error("Razorpay is not configured");
  }

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  const expected = Buffer.from(expectedSignature);
  const received = Buffer.from(String(razorpaySignature || ""));

  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, received);
}

export function verifyRazorpayWebhookSignature({
  rawBody,
  signature,
  secret = process.env.RAZORPAY_WEBHOOK_SECRET,
}) {
  if (!secret) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured");
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const expected = Buffer.from(expectedSignature);
  const received = Buffer.from(String(signature || ""));

  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, received);
}
