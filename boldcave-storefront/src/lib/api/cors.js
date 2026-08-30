import { NextResponse } from "next/server";

const DEFAULT_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const DEFAULT_HEADERS = "Content-Type,Authorization";

export function getAllowedAdminOrigins() {
  return String(process.env.ADMIN_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isAllowedAdminOrigin(origin) {
  if (!origin) return false;

  const allowedOrigins = getAllowedAdminOrigins();

  // Exact production/custom URLs from env
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  try {
    const { protocol, hostname } = new URL(origin);

    if (protocol !== "https:") {
      return false;
    }

    // Allow only this admin project's changing Vercel deployment URLs
    if (
      hostname === "admin-liard-seven.vercel.app" ||
      hostname.startsWith("admin-liard-seven-") &&
        hostname.endsWith(".vercel.app")
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function applyAdminCors(request, response) {
  const origin = request.headers.get("origin");

  if (isAllowedAdminOrigin(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Vary", "Origin");
  }

  response.headers.set("Access-Control-Allow-Methods", DEFAULT_METHODS);
  response.headers.set("Access-Control-Allow-Headers", DEFAULT_HEADERS);

  return response;
}

export function adminPreflight(request) {
  return applyAdminCors(
    request,
    new NextResponse(null, { status: 204 })
  );
}