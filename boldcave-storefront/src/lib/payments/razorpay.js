import crypto from "node:crypto";
import Razorpay from "razorpay";

let instance = null;

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
