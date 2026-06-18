import "server-only";

export type GitHubUserInstallation = {
  id: number;
  accountLogin: string;
  accountType: string;
};

export type GitHubUserRepository = {
  githubId: string;
  owner: string;
  name: string;
  fullName: string;
  isPrivate: boolean;
  installationId: string;
  installationAccountLogin: string;
};

type UserInstallationsResponse = {
  installations?: Array<{
    id: number;
    account?: {
      login?: string;
      type?: string;
    } | null;
  }>;
};

type InstallationRepositoriesResponse = {
  repositories?: Array<{
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    owner?: {
      login?: string;
    } | null;
  }>;
};

export async function listGitHubUserAppRepositories(
  accessToken: string
): Promise<GitHubUserRepository[]> {
  const installations = await listUserInstallations(accessToken);
  const repositories = await Promise.all(
    installations.map((installation) =>
      listInstallationRepositories(accessToken, installation)
    )
  );

  return repositories.flat().sort((a, b) => a.fullName.localeCompare(b.fullName));
}

async function listUserInstallations(
  accessToken: string
): Promise<GitHubUserInstallation[]> {
  const payload = await githubGet<UserInstallationsResponse>(
    "https://api.github.com/user/installations?per_page=100",
    accessToken
  );

  return (payload.installations ?? []).map((installation) => ({
    id: installation.id,
    accountLogin: installation.account?.login ?? "unknown",
    accountType: installation.account?.type ?? "unknown"
  }));
}

async function listInstallationRepositories(
  accessToken: string,
  installation: GitHubUserInstallation
): Promise<GitHubUserRepository[]> {
  const payload = await githubGet<InstallationRepositoriesResponse>(
    `https://api.github.com/user/installations/${installation.id}/repositories?per_page=100`,
    accessToken
  );

  return (payload.repositories ?? []).map((repository) => {
    const [ownerFromName = installation.accountLogin, repoFromName = repository.name] =
      repository.full_name.split("/");

    return {
      githubId: String(repository.id),
      owner: repository.owner?.login ?? ownerFromName,
      name: repoFromName,
      fullName: repository.full_name,
      isPrivate: repository.private,
      installationId: String(installation.id),
      installationAccountLogin: installation.accountLogin
    };
  });
}

async function githubGet<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "BitSpam Dashboard",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    next: {
      revalidate: 30
    }
  });

  if (!response.ok) {
    throw new Error("Could not load GitHub App repositories for this user.");
  }

  return (await response.json()) as T;
}
