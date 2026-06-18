export type GitHubWebhookEvent = "pull_request" | "installation" | "installation_repositories";

export type GitHubWebhookEnvelope = {
  event: string;
  delivery: string;
  payload: unknown;
};

export type PullRequestWebhookPayload = {
  action: string;
  installation?: {
    id: number;
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    owner: {
      login: string;
    };
  };
  pull_request: {
    number: number;
    html_url: string;
    title: string;
    state: string;
    draft?: boolean;
    user: {
      login: string;
    } | null;
    head: {
      sha: string;
    };
    base: {
      sha: string;
    };
  };
};

export type InstallationWebhookPayload = {
  action: string;
  installation: {
    id: number;
    account: {
      login: string;
      type: string;
    } | null;
  };
  repositories?: Array<InstallationRepositoryPayload>;
  repositories_added?: Array<InstallationRepositoryPayload>;
  repositories_removed?: Array<InstallationRepositoryPayload>;
};

export type InstallationRepositoryPayload = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
};

export function parseWebhookJson(body: string): unknown {
  return JSON.parse(body) as unknown;
}

export function isPullRequestWebhookPayload(
  payload: unknown
): payload is PullRequestWebhookPayload {
  return (
    isRecord(payload) &&
    typeof payload.action === "string" &&
    isRecord(payload.repository) &&
    isRecord(payload.repository.owner) &&
    isRecord(payload.pull_request) &&
    typeof payload.repository.id === "number" &&
    typeof payload.repository.name === "string" &&
    typeof payload.repository.full_name === "string" &&
    typeof payload.repository.private === "boolean" &&
    typeof payload.repository.owner.login === "string" &&
    typeof payload.pull_request.number === "number" &&
    typeof payload.pull_request.html_url === "string" &&
    typeof payload.pull_request.title === "string" &&
    typeof payload.pull_request.state === "string" &&
    isRecord(payload.pull_request.head) &&
    isRecord(payload.pull_request.base) &&
    typeof payload.pull_request.head.sha === "string" &&
    typeof payload.pull_request.base.sha === "string"
  );
}

export function isInstallationWebhookPayload(
  payload: unknown
): payload is InstallationWebhookPayload {
  return (
    isRecord(payload) &&
    typeof payload.action === "string" &&
    isRecord(payload.installation) &&
    typeof payload.installation.id === "number"
  );
}

export function shouldAnalyzePullRequestAction(action: string, draft?: boolean): boolean {
  return (
    !draft &&
    ["opened", "reopened", "synchronize", "ready_for_review"].includes(action)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
