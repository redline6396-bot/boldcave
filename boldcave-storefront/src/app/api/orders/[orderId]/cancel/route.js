import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { CancellationError, cancelOrder } from "@/lib/orders/cancellation";

export const runtime = "nodejs";

export async function POST(request, context) {
  return withRuntimeDatabase(() => cancelOrderRoute(request, context));
}

async function cancelOrderRoute(request, { params }) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;

    const { orderId } = await params;
    const body = await readJson(request);

    const result = await cancelOrder({
      orderId,
      actor: "customer",
      userId: auth.user._id,
      reason: body.reason,
    });

    return success(result);
  } catch (error) {
    if (error instanceof CancellationError) {
      return failure(error.code, error.message, error.status, error.details);
    }

    return handleRouteError(error, "ORDER_CANCEL_FAILED");
  }
}
