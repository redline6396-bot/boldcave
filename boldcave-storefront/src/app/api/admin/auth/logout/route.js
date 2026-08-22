import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { clearAdminSessionCookie } from "@/lib/auth/session";
import { success } from "@/lib/api/response";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function POST(request) {
  const response = success({ loggedOut: true });
  clearAdminSessionCookie(response);
  return applyAdminCors(request, response);
}
