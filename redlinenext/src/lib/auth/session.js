import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

import connectDB from "@/lib/db";
import { failure } from "@/lib/api/response";
import { normalizePhone } from "@/lib/validation";
import User from "@/models/User";

export const USER_SESSION_COOKIE = "customer_session";
export const ADMIN_SESSION_COOKIE = "admin_session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

function getSecret(name, fallbackName) {
  const value = process.env[name] || (fallbackName ? process.env[fallbackName] : "");
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function cookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge,
  };
}

export function signUserSession(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      phone: user.phone,
      type: "customer",
    },
    getSecret("AUTH_SECRET", "JWT_SECRET"),
    { expiresIn: SESSION_MAX_AGE_SECONDS }
  );
}

export function signAdminSession() {
  return jwt.sign(
    {
      sub: "admin",
      type: "admin",
    },
    getSecret("ADMIN_AUTH_SECRET", "AUTH_SECRET"),
    { expiresIn: ADMIN_SESSION_MAX_AGE_SECONDS }
  );
}

export function setUserSessionCookie(response, token) {
  response.cookies.set(USER_SESSION_COOKIE, token, cookieOptions(SESSION_MAX_AGE_SECONDS));
  return response;
}

export function clearUserSessionCookie(response) {
  response.cookies.set(USER_SESSION_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  return response;
}

export function setAdminSessionCookie(response, token) {
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    token,
    cookieOptions(ADMIN_SESSION_MAX_AGE_SECONDS)
  );
  return response;
}

export function clearAdminSessionCookie(response) {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  return response;
}

async function getTokenFromRequest(request, cookieName) {
  const header = request.headers.get("authorization") || "";
  const [type, token] = header.split(" ");

  if (type === "Bearer" && token) {
    return token;
  }

  const cookieStore = await cookies();
  return cookieStore.get(cookieName)?.value || "";
}

export async function requireUser(request) {
  try {
    const token = await getTokenFromRequest(request, USER_SESSION_COOKIE);
    if (!token) {
      return {
        response: failure("UNAUTHENTICATED", "Please sign in", 401),
      };
    }

    const decoded = jwt.verify(token, getSecret("AUTH_SECRET", "JWT_SECRET"));
    if (decoded.type !== "customer" || !decoded.sub) {
      return {
        response: failure("UNAUTHENTICATED", "Invalid session", 401),
      };
    }

    await connectDB();
    const user = await User.findById(decoded.sub);
    if (!user) {
      return {
        response: failure("UNAUTHENTICATED", "User not found", 401),
      };
    }

    if (user.status === "suspended") {
      return {
        response: failure("USER_SUSPENDED", "This account is suspended", 403),
      };
    }

    return { user };
  } catch (error) {
    if (error?.message?.includes("not configured")) {
      return {
        response: failure("CONFIGURATION_ERROR", error.message, 503),
      };
    }

    return {
      response: failure("UNAUTHENTICATED", "Invalid or expired session", 401),
    };
  }
}

export async function requireAdmin(request) {
  try {
    const token = await getTokenFromRequest(request, ADMIN_SESSION_COOKIE);
    if (!token) {
      return {
        response: failure("UNAUTHENTICATED", "Admin sign in required", 401),
      };
    }

    const decoded = jwt.verify(token, getSecret("ADMIN_AUTH_SECRET", "AUTH_SECRET"));
    if (decoded.type !== "admin") {
      return {
        response: failure("FORBIDDEN", "Admin access required", 403),
      };
    }

    return { admin: { id: "admin" } };
  } catch (error) {
    if (error?.message?.includes("not configured")) {
      return {
        response: failure("CONFIGURATION_ERROR", error.message, 503),
      };
    }

    return {
      response: failure("UNAUTHENTICATED", "Invalid or expired admin session", 401),
    };
  }
}

export function safeUser(user) {
  return {
    id: String(user._id),
    phone: normalizePhone(user.phone) || user.phone,
    phoneVerified: user.phoneVerified,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    email: user.email || "",
    addresses: user.addresses || [],
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
