import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { requireAdmin } from "@/lib/auth/session";
import { success } from "@/lib/api/response";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.response) return applyAdminCors(request, auth.response);

  return applyAdminCors(request, success({ admin: { id: "admin" } }));
}
