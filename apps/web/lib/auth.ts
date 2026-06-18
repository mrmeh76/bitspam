import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

const sessionCookieName = "bitspam_session";
const oauthStateCookieName = "bitspam_oauth_state";
const maxAgeSeconds = 60 * 60 * 24 * 7;

export type AuthSession = {
  user: {
    id: number;
    login: string;
    name?: string | null;
    avatarUrl?: string | null;
    htmlUrl?: string | null;
  };
  accessToken: string;
  createdAt: string;
};

type GitHubTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GitHubUserResponse = {
  id: number;
  login: string;
  name?: string | null;
  avatar_url?: string | null;
  html_url?: string | null;
};

export async function requireAuth(next = "/dashboard"): Promise<AuthSession> {
  const session = await getAuthSession();

  if (!session) {
    redirect(`/api/auth/github/start?next=${encodeURIComponent(next)}`);
  }

  return session;
}

export async function getAuthSession(): Promise<AuthSession | undefined> {
  const cookieStore = await cookies();
  const sealed = cookieStore.get(sessionCookieName)?.value;

  if (!sealed) {
    return undefined;
  }

  try {
    return unseal<AuthSession>(sealed);
  } catch {
    return undefined;
  }
}

export function createGitHubLoginResponse(next: string): NextResponse {
  const state = randomBytes(24).toString("hex");
  const response = NextResponse.redirect(githubAuthorizeUrl(state));

  response.cookies.set(oauthStateCookieName, seal({ state, next }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600
  });

  return response;
}

export async function createGitHubCallbackResponse({
  code,
  state
}: {
  code: string;
  state: string;
}): Promise<NextResponse> {
  const cookieStore = await cookies();
  const expected = cookieStore.get(oauthStateCookieName)?.value;

  if (!expected) {
    throw new Error("OAuth state cookie is missing.");
  }

  const statePayload = unseal<{ state: string; next: string }>(expected);

  if (statePayload.state !== state) {
    throw new Error("OAuth state did not match.");
  }

  const accessToken = await exchangeCodeForToken(code);
  const user = await fetchGitHubUser(accessToken);
  const response = NextResponse.redirect(new URL(safeNextPath(statePayload.next), appUrl()));

  response.cookies.set(sessionCookieName, seal({
    user: {
      id: user.id,
      login: user.login,
      name: user.name ?? null,
      avatarUrl: user.avatar_url ?? null,
      htmlUrl: user.html_url ?? null
    },
    accessToken,
    createdAt: new Date().toISOString()
  } satisfies AuthSession), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds
  });
  response.cookies.delete(oauthStateCookieName);

  return response;
}

export function createLogoutResponse(): NextResponse {
  const response = NextResponse.redirect(new URL("/", appUrl()));

  response.cookies.delete(sessionCookieName);

  return response;
}

function githubAuthorizeUrl(state: string): string {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", requiredEnv("GITHUB_APP_CLIENT_ID"));
  url.searchParams.set("redirect_uri", `${appUrl()}/api/auth/github/callback`);
  url.searchParams.set("state", state);

  return url.toString();
}

async function exchangeCodeForToken(code: string): Promise<string> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: requiredEnv("GITHUB_APP_CLIENT_ID"),
      client_secret: requiredEnv("GITHUB_APP_CLIENT_SECRET"),
      code,
      redirect_uri: `${appUrl()}/api/auth/github/callback`
    })
  });
  const payload = (await response.json()) as GitHubTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description ?? payload.error ?? "GitHub OAuth failed.");
  }

  return payload.access_token;
}

async function fetchGitHubUser(accessToken: string): Promise<GitHubUserResponse> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "BitSpam Dashboard"
    }
  });

  if (!response.ok) {
    throw new Error("Could not load GitHub user profile.");
  }

  return (await response.json()) as GitHubUserResponse;
}

function seal(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sessionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function unseal<T>(sealed: string): T {
  const payload = Buffer.from(sealed, "base64url");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", sessionKey(), iv);
  decipher.setAuthTag(tag);

  return JSON.parse(
    Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
  ) as T;
}

function sessionKey(): Buffer {
  return createHash("sha256").update(requiredEnv("BITSPAM_SESSION_SECRET")).digest();
}

function appUrl(): string {
  return requiredEnv("NEXT_PUBLIC_APP_URL").replace(/\/$/, "");
}

function safeNextPath(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}
