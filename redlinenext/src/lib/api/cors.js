import { NextResponse } from "next/server";

const DEFAULT_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const DEFAULT_HEADERS = "Content-Type,Authorization";

export function getAllowedAdminOrigins() {
  return String(process.env.ADMIN_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function applyAdminCors(request, response) {
  const origin = request.headers.get("origin");
  const allowedOrigins = getAllowedAdminOrigins();

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Vary", "Origin");
  }

  response.headers.set("Access-Control-Allow-Methods", DEFAULT_METHODS);
  response.headers.set("Access-Control-Allow-Headers", DEFAULT_HEADERS);
  return response;
}

export function adminPreflight(request) {
  return applyAdminCors(request, new NextResponse(null, { status: 204 }));
}
