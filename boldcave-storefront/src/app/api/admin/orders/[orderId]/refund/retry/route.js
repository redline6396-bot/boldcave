import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { CancellationError, retryOrderRefund } from "@/lib/orders/cancellation";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function POST(request, context) {
  return withRuntimeDatabase(() => retryAdminOrderRefundRoute(request, context));
}

async function retryAdminOrderRefundRoute(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { orderId } = await params;
    const result = await retryOrderRefund({ orderId });

    return applyAdminCors(request, success(result));
  } catch (error) {
    if (error instanceof CancellationError) {
      return applyAdminCors(
        request,
        failure(error.code, error.message, error.status, error.details)
      );
    }

    return applyAdminCors(request, handleRouteError(error, "ADMIN_REFUND_RETRY_FAILED"));
  }
}
