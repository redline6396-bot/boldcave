import mongoose from "mongoose";

export const PRODUCT_CATEGORIES = ["Men", "Women", "Unisex"];
export const ORDER_STATUSES = [
  "shipping_pending",
  "confirmed",
  "processing",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

export const ADMIN_MANUAL_ORDER_STATUSES = [
  "confirmed",
  "processing",
  "cancelled",
];

export function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

export function cleanString(value, maxLength = 1000) {
  return String(value || "").trim().slice(0, maxLength);
}

export function isValidPhone(value) {
  return /^[6-9]\d{9}$/.test(String(value || "").trim());
}

export function isValidEmail(value) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

export function isValidPincode(value) {
  return /^\d{6}$/.test(String(value || "").trim());
}

export function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (/^[6-9]\d{9}$/.test(digits)) {
    return digits;
  }

  if (/^91[6-9]\d{9}$/.test(digits)) {
    return digits.slice(2);
  }

  return "";
}

export function normalizeCouponCode(value) {
  return cleanString(value, 30).toUpperCase();
}

export function normalizeBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === "boolean") return value;
  return ["true", "1", "yes"].includes(String(value).toLowerCase());
}

export function slugify(value) {
  return cleanString(value, 120)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function validateCategory(category) {
  return PRODUCT_CATEGORIES.includes(category);
}

export function validateVariantSize(size) {
  return Boolean(cleanString(size, 40));
}

export function toPositiveNumber(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return number;
}

export function toPositiveInteger(value, fallback = 0) {
  return Math.floor(toPositiveNumber(value, fallback));
}
