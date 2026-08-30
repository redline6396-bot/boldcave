import axios from "axios";

const ADMIN_PROXY_BASE_PATH = "/backend";

const directApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:3000";

const configuredBaseUrl =
  process.env.NODE_ENV === "production"
    ? ADMIN_PROXY_BASE_PATH
    : directApiBaseUrl;

export const API_BASE_URL = configuredBaseUrl.replace(/\/api\/?$/, "");

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export function getErrorMessage(error, fallback = "Request failed") {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

export function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getId(record) {
  return record?.id || record?._id;
}
