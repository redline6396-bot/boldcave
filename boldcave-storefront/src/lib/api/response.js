import { NextResponse } from "next/server";

export function success(data = null, status = 200, init = {}) {
  return NextResponse.json({ success: true, data }, { status, ...init });
}

export function failure(code, message, status = 500, details = undefined, init = {}) {
  const body = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (details !== undefined) {
    body.error.details = details;
  }

  return NextResponse.json(body, { status, ...init });
}

export function handleRouteError(error, fallbackCode = "INTERNAL_ERROR") {
  if (error?.name === "ValidationError") {
    return failure("VALIDATION_ERROR", error.message, 400);
  }

  if (error?.code === 11000) {
    return failure("DUPLICATE_VALUE", "A record with this value already exists", 409);
  }

  if (error?.message?.includes("not configured")) {
    return failure("CONFIGURATION_ERROR", "Service is not configured", 503);
  }

  console.error("API route error:", error);
  return failure(fallbackCode, "Something went wrong", 500);
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export const noStoreHeaders = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
  Expires: "0",
};

export const publicBrowseCacheHeaders = {
  "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
};

export const publicSettingsCacheHeaders = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
};
