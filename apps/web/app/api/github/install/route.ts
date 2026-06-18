import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  const slug = process.env.GITHUB_APP_SLUG ?? "bitspam";

  return NextResponse.redirect(`https://github.com/apps/${slug}/installations/new`);
}
