import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import {
  failure,
  handleRouteError,
  noStoreHeaders,
  readJson,
  success,
} from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { cleanString } from "@/lib/validation";
import AdminNotification from "@/models/AdminNotification";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function GET(request) {
  return withRuntimeDatabase(() => getAdminNotificationsRoute(request));
}

export async function PATCH(request) {
  return withRuntimeDatabase(() => updateAdminNotificationsRoute(request));
}

async function getAdminNotificationsRoute(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 50);

    await connectDB();
    const [notifications, unreadCount] = await Promise.all([
      AdminNotification.find({}).sort({ createdAt: -1 }).limit(limit).lean(),
      AdminNotification.countDocuments({ readAt: null }),
    ]);

    return applyAdminCors(
      request,
      success(
        {
          notifications: notifications.map(serializeNotification),
          unreadCount,
        },
        200,
        { headers: noStoreHeaders }
      )
    );
  } catch (error) {
    return applyAdminCors(
      request,
      handleRouteError(error, "ADMIN_NOTIFICATIONS_LOAD_FAILED")
    );
  }
}

async function updateAdminNotificationsRoute(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const body = await readJson(request);
    const action = cleanString(body.action, 40);
    await connectDB();

    if (action === "markAllRead") {
      const readAt = new Date();
      await AdminNotification.updateMany(
        { readAt: null },
        { $set: { readAt } }
      );
      return applyAdminCors(
        request,
        success({ unreadCount: 0 }, 200, { headers: noStoreHeaders })
      );
    }

    if (action === "markRead") {
      const id = cleanString(body.id, 200);
      if (!id) {
        return applyAdminCors(
          request,
          failure("NOTIFICATION_ID_REQUIRED", "Notification id is required.", 400)
        );
      }

      const notification = await AdminNotification.findByIdAndUpdate(
        id,
        { $set: { readAt: new Date() } },
        { returnDocument: "after" }
      ).lean();

      if (!notification) {
        return applyAdminCors(
          request,
          failure("NOTIFICATION_NOT_FOUND", "Notification not found.", 404)
        );
      }

      const unreadCount = await AdminNotification.countDocuments({ readAt: null });
      return applyAdminCors(
        request,
        success(
          { notification: serializeNotification(notification), unreadCount },
          200,
          { headers: noStoreHeaders }
        )
      );
    }

    return applyAdminCors(
      request,
      failure("INVALID_NOTIFICATION_ACTION", "Invalid notification action.", 400)
    );
  } catch (error) {
    return applyAdminCors(
      request,
      handleRouteError(error, "ADMIN_NOTIFICATION_UPDATE_FAILED")
    );
  }
}

function serializeNotification(notification) {
  return {
    id: String(notification._id),
    kind: notification.kind,
    title: notification.title,
    message: notification.message,
    href: notification.href,
    readAt: notification.readAt || null,
    createdAt: notification.createdAt || null,
  };
}
