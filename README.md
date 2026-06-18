# BitSpam

BitSpam is a GitHub App and maintainer dashboard for detecting low-quality,
spammy, or AI-assisted pull requests without shutting out serious new
contributors.

The product gives maintainers a fast triage layer:

- Paste a public GitHub PR URL and get a saved analysis report.
- Install the GitHub App on a repository and let BitSpam react to PR webhooks.
- [Install BitSpam](https://github.com/apps/bitspam)
- Queue longer analysis work through BullMQ and a separate worker.
- Store analysis history, findings, repository policy, and proof-of-work
  comments in Postgres.
- Use deterministic checks plus optional structured Gemini reasoning.

BitSpam is built for the hackathon prompt: solve open-source contribution spam
while still welcoming contributors who are willing to show intent, test
evidence, and proof of work.

## GitHub App Availability

BitSpam is registered as a public GitHub App so repository owners can
install it on repositories they control.

- [BitSpam](https://github.com/apps/bitspam)

## Logo

Primary mark:

![BitSpam logo](apps/web/public/bitspam-logo.svg)

Small mark:

![BitSpam mark](apps/web/public/bitspam-mark.svg)

## Architecture

```text
GitHub PR / Paste URL
        |
        v
Next.js web app on Vercel
  - /analyze
  - /dashboard
  - /api/analyze
  - /api/github/webhook
        |
        +--> Postgres: repositories, PRs, runs, findings, policies
        |
        +--> Redis/BullMQ: analyze-pr jobs
                         |
                         v
                  Worker service
                  - fetch PR context
                  - run analyzer
                  - optional Gemini reasoning
                  - save result
                  - update GitHub check run / labels / comment
```

## Monorepo layout

```text
apps/
  web/       Next.js web app, API routes, dashboard, auth
  worker/    BullMQ worker that processes analyze-pr jobs
packages/
  analyzer/  Deterministic checks plus optional AI reasoning
  db/        Drizzle schema and persistence helpers
  github/    GitHub URL parsing, PR fetching, app auth, webhook helpers
  queue/     BullMQ queue and worker definitions
  shared/    Shared TypeScript contracts
```

## Local setup

Requirements:

- Node.js 22+
- pnpm through Corepack
- Docker Desktop for local Postgres and Redis

Install dependencies:

```bash
corepack enable
corepack pnpm install
```

Create local env:

```bash
cp .env.example .env
```

Start local infrastructure:

```bash
docker compose up -d
```

Push the Drizzle schema:

```bash
corepack pnpm db:push
```

Run the web app:

```bash
corepack pnpm --filter @bitspam/web dev
```

Run the worker in another terminal:

```bash
corepack pnpm worker:dev
```

Useful checks:

```bash
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
corepack pnpm lint
```

## Environment variables

The current `.env.example` has the expected production variable names.

| Name | Required for | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Web, worker | Postgres connection string. Use Neon/Supabase with SSL in production. |
| `REDIS_URL` | Web, worker | Redis-compatible URL for BullMQ. Use Upstash Redis with a TCP Redis URL, Redis Cloud, Railway Redis, or Render Key Value. |
| `NEXT_PUBLIC_APP_URL` | Web, worker, GitHub App | Production site URL, for example `https://bitspam.vercel.app`. |
| `BITSPAM_SESSION_SECRET` | Web dashboard OAuth | Long random secret for encrypted dashboard session cookies. Generate with `openssl rand -base64 32`. |
| `GITHUB_APP_ID` | Webhook, worker | Numeric GitHub App ID. |
| `GITHUB_APP_CLIENT_ID` | Dashboard OAuth | GitHub App client ID. |
| `GITHUB_APP_CLIENT_SECRET` | Dashboard OAuth | GitHub App client secret. |
| `GITHUB_APP_PRIVATE_KEY` | Worker, webhooks | Private key PEM. Store with literal `\n` escapes if your host uses single-line env values. |
| `GITHUB_WEBHOOK_SECRET` | Webhook | Shared secret configured in the GitHub App. |
| `GITHUB_TOKEN` | Paste URL fallback | Optional token for higher public GitHub API rate limits. Not exposed to the frontend. |
| `AI_PROVIDER` | Worker/analyzer | Use `gemini` for the current demo. |
| `GEMINI_API_KEY` | AI reasoning | Gemini API key. Required only when AI reasoning is enabled. |
| `GEMINI_MODEL` | AI reasoning | Default: `gemini-2.5-flash`. |
| `OPENAI_API_KEY` | Optional | Not needed for the current Gemini-first deployment. Leave blank. |
| `OPENAI_MODEL` | Optional | Not needed unless switching provider. |
| `BITSPAM_DEFAULT_MODE` | Analyzer | `advisory` recommended for demo. |
| `BITSPAM_ALLOW_INSECURE_GITHUB_TLS` | Local debug only | Keep `false` in production. |

## References

- Vercel Git deployment: https://vercel.com/docs/git/vercel-for-github
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Render background workers: https://render.com/docs/background-workers
- Neon connection strings: https://neon.com/docs/connect/connect-from-any-app
- GitHub App registration: https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app
- Gemini API keys: https://ai.google.dev/gemini-api/docs/api-key
