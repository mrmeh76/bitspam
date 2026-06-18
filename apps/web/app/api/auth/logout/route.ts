import { createLogoutResponse } from "@/lib/auth";

export const runtime = "nodejs";

export function POST() {
  return createLogoutResponse();
}
