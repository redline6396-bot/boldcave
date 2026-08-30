import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { CancellationError, cancelOrder } from "@/lib/orders/cancellation";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function POST(request, context) {
  return withRuntimeDatabase(() => cancelAdminOrderRoute(request, context));
}

async function cancelAdminOrderRoute(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { orderId } = await params;
    const body = await readJson(request);
    const result = await cancelOrder({
      orderId,
      actor: "admin",
      reason: body.reason,
    });

    return applyAdminCors(request, success(result));
  } catch (error) {
    if (error instanceof CancellationError) {
      return applyAdminCors(
        request,
        failure(error.code, error.message, error.status, error.details)
      );
    }

    return applyAdminCors(request, handleRouteError(error, "ADMIN_ORDER_CANCEL_FAILED"));
  }
}
