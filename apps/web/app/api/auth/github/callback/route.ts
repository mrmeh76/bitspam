import { NextResponse } from "next/server";

import { createGitHubCallbackResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json({ error: "Missing GitHub OAuth callback parameters." }, { status: 400 });
  }

  try {
    return await createGitHubCallbackResponse({ code, state });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "GitHub login failed."
    }, { status: 400 });
  }
}
