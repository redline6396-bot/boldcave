import { success } from "@/lib/api/response";
import { clearUserSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST() {
  const response = success({ loggedOut: true });
  return clearUserSessionCookie(response);
}
