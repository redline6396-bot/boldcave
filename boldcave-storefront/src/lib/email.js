import { isValidEmail } from "@/lib/validation";

const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";

export class EmailDeliveryError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "EmailDeliveryError";
    this.code = code;
  }
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function textToEmailHtml(text) {
  return `<div style="margin:0 auto;max-width:640px;padding:24px 18px;font-family:Arial,sans-serif;font-size:16px;line-height:1.65;color:#171717;white-space:pre-wrap">${escapeHtml(text)}</div>`;
}

function sanitizeHeader(value, maxLength) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim().slice(0, maxLength);
}

function getFromAddress() {
  const email = String(process.env.EMAIL_FROM || "").trim().toLowerCase();
  const name = sanitizeHeader(process.env.EMAIL_FROM_NAME || "Bold Cave", 100);
  if (!email || !isValidEmail(email)) {
    throw new EmailDeliveryError("EMAIL_FROM_INVALID", "Email sender is not configured.");
  }
  return name ? `${name} <${email}>` : email;
}

export function isEmailDeliveryConfigured() {
  const provider = String(process.env.EMAIL_PROVIDER || "resend").trim().toLowerCase();
  const apiKey = String(process.env.EMAIL_API_KEY || "").trim();
  const fromEmail = String(process.env.EMAIL_FROM || "").trim().toLowerCase();
  return provider === "resend" && Boolean(apiKey) && isValidEmail(fromEmail);
}

export async function sendEmail({ to, subject, text, html, idempotencyKey }) {
  const provider = String(process.env.EMAIL_PROVIDER || "resend").trim().toLowerCase();
  const apiKey = String(process.env.EMAIL_API_KEY || "").trim();
  const recipient = String(to || "").trim().toLowerCase();

  if (provider !== "resend") {
    throw new EmailDeliveryError("EMAIL_PROVIDER_UNSUPPORTED", "Email provider is not supported.");
  }
  if (!apiKey) {
    throw new EmailDeliveryError("EMAIL_API_KEY_MISSING", "Email provider is not configured.");
  }
  if (!recipient || !isValidEmail(recipient)) {
    throw new EmailDeliveryError("EMAIL_RECIPIENT_INVALID", "Recipient email is invalid.");
  }

  const response = await fetch(RESEND_EMAIL_ENDPOINT, {
    method: "POST",
    signal: globalThis.AbortSignal.timeout(10000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(idempotencyKey
        ? { "Idempotency-Key": sanitizeHeader(idempotencyKey, 256) }
        : {}),
    },
    body: JSON.stringify({
      from: getFromAddress(),
      to: [recipient],
      subject: sanitizeHeader(subject, 300),
      text: String(text || ""),
      html: html || textToEmailHtml(text),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.id) {
    const providerCode = sanitizeHeader(data?.name || data?.statusCode || response.status, 80);
    throw new EmailDeliveryError(
      providerCode ? `RESEND_${providerCode}` : "EMAIL_SEND_FAILED",
      "The email provider did not accept the message."
    );
  }

  return { provider: "resend", messageId: String(data.id) };
}
