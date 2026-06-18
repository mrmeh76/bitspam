import { createGitHubLoginResponse } from "@/lib/auth";

export const runtime = "nodejs";

export function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/dashboard";

  return createGitHubLoginResponse(next);
}
