import { createHmac, timingSafeEqual } from "node:crypto";

import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

export type GitHubAppCredentials = {
  appId: string;
  privateKey: string;
};

export type GitHubWebhookHeaders = {
  signature256?: string | null;
};

export async function createInstallationOctokit(
  credentials: GitHubAppCredentials,
  installationId: string | number
): Promise<Octokit> {
  const auth = createAppAuth({
    appId: credentials.appId,
    privateKey: normalizePrivateKey(credentials.privateKey)
  });
  const installationAuthentication = await auth({
    type: "installation",
    installationId: Number(installationId)
  });

  return new Octokit({
    auth: installationAuthentication.token,
    userAgent: "BitSpam GitHub App"
  });
}

export function verifyGitHubWebhookSignature(
  body: string,
  secret: string,
  { signature256 }: GitHubWebhookHeaders
): boolean {
  if (!signature256 || !signature256.startsWith("sha256=")) {
    return false;
  }

  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(signature256, "utf8");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function normalizePrivateKey(privateKey: string): string {
  return privateKey.replace(/\\n/g, "\n");
}
