import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { createOrderRefund, RefundServiceError } from "@/lib/payments/refunds";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function POST(request, context) {
  return withRuntimeDatabase(() => refundAdminOrderRoute(request, context));
}

async function refundAdminOrderRoute(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { orderId } = await params;
    const body = await readJson(request);
    const result = await createOrderRefund({
      orderId,
      amount: body.amount,
      reason: body.reason || body.note || "Admin refund",
      actor: "admin",
      requireAdmin: true,
    });

    return applyAdminCors(
      request,
      success({
        order: result.order,
        refund: result.refund,
        idempotent: Boolean(result.idempotent),
      })
    );
  } catch (error) {
    if (error instanceof RefundServiceError) {
      return applyAdminCors(
        request,
        failure(error.code, error.message, error.status, error.details)
      );
    }

    return applyAdminCors(request, handleRouteError(error, "ADMIN_REFUND_FAILED"));
  }
}
