import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { isObjectId } from "@/lib/validation";
import Order from "@/models/Order";
import User from "@/models/User";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function GET(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { userId } = await params;
    if (!isObjectId(userId)) return applyAdminCors(request, failure("INVALID_USER_ID", "Invalid user id", 400));

    await connectDB();
    const [user, orders] = await Promise.all([
      User.findById(userId),
      Order.find({ user: userId }).sort({ createdAt: -1 }).limit(50),
    ]);

    if (!user) return applyAdminCors(request, failure("USER_NOT_FOUND", "User not found", 404));
    return applyAdminCors(request, success({ user, orders }));
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error));
  }
}

export async function PATCH(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { userId } = await params;
    if (!isObjectId(userId)) return applyAdminCors(request, failure("INVALID_USER_ID", "Invalid user id", 400));

    const body = await readJson(request);
    const status = String(body.status || "").trim();
    if (!["active", "suspended"].includes(status)) {
      return applyAdminCors(request, failure("INVALID_STATUS", "User status must be active or suspended", 400));
    }

    await connectDB();
    const user = await User.findByIdAndUpdate(userId, { status }, { new: true });
    if (!user) return applyAdminCors(request, failure("USER_NOT_FOUND", "User not found", 404));

    return applyAdminCors(request, success({ user }));
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error, "USER_UPDATE_FAILED"));
  }
}
