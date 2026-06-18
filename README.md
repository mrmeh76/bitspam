# BitSpam

BitSpam is a GitHub App and maintainer dashboard for detecting low-quality,
spammy, or AI-assisted pull requests without shutting out serious new
contributors.

The product gives maintainers a fast triage layer:

- Paste a public GitHub PR URL and get a saved analysis report.
- Install the GitHub App on a repository and let BitSpam react to PR webhooks.
- Queue longer analysis work through BullMQ and a separate worker.
- Store analysis history, findings, repository policy, and proof-of-work
  comments in Postgres.
- Use deterministic checks plus optional structured Gemini reasoning.

BitSpam is built for the hackathon prompt: solve open-source contribution spam
while still welcoming contributors who are willing to show intent, test
evidence, and proof of work.

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

Do not commit `.env`.

## Fastest production deployment

This is the fastest path to a live hackathon demo.

### 1. Create Postgres

Recommended fast option: Neon.

1. Create a Neon project.
2. Open the project dashboard and click **Connect**.
3. Copy the pooled Postgres connection string.
4. Use it as `DATABASE_URL`.

Neon connection strings look like:

```text
postgresql://user:password@host-pooler.region.aws.neon.tech/dbname?sslmode=require&channel_binding=require
```

Run migrations/schema push from your local machine against production:

```bash
$env:DATABASE_URL="postgresql://..."
corepack pnpm db:push
```

On macOS/Linux:

```bash
DATABASE_URL="postgresql://..." corepack pnpm db:push
```

### 2. Create Redis

Recommended fast options:

- Redis Cloud or Railway Redis: easiest BullMQ-compatible `redis://` URL.
- Upstash Redis: use a Redis-compatible TCP endpoint if available on your plan.

Set `REDIS_URL` to a Redis-compatible URL, not the Upstash REST URL pair. BullMQ
uses ioredis under the hood, so it needs Redis protocol access.

Examples:

```text
redis://default:password@host:6379
rediss://default:password@host:6379
```

### 3. Deploy the web app to Vercel

1. Push this repo to GitHub.
2. In Vercel, import the GitHub repository.
3. Set the project root directory to `apps/web`.
4. Use pnpm. If Vercel does not auto-detect the monorepo correctly, set:
   - Install command: `corepack pnpm install --frozen-lockfile`
   - Build command: `cd ../.. && corepack pnpm --filter @bitspam/web build`
5. Add web env vars:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `NEXT_PUBLIC_APP_URL`
   - `BITSPAM_SESSION_SECRET`
   - `GITHUB_APP_ID`
   - `GITHUB_APP_CLIENT_ID`
   - `GITHUB_APP_CLIENT_SECRET`
   - `GITHUB_APP_PRIVATE_KEY`
   - `GITHUB_WEBHOOK_SECRET`
   - `GITHUB_TOKEN` optional
   - `AI_PROVIDER=gemini`
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL=gemini-2.5-flash`
6. Deploy.
7. Set `NEXT_PUBLIC_APP_URL` to the production Vercel URL and redeploy.

Expected web routes:

- `/` public homepage
- `/analyze` public PR URL analysis
- `/dashboard` GitHub OAuth protected maintainer console
- `/api/github/webhook` GitHub App webhook URL

### 4. Deploy the worker

Recommended fast option: Render Background Worker.

1. Create a new Render **Background Worker** from the same GitHub repo.
2. Runtime: Node.
3. Build command:

```bash
corepack pnpm install --frozen-lockfile && corepack pnpm --filter @bitspam/worker build
```

4. Start command:

```bash
corepack pnpm --filter @bitspam/worker start
```

5. Add worker env vars:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `NEXT_PUBLIC_APP_URL`
   - `GITHUB_APP_ID`
   - `GITHUB_APP_PRIVATE_KEY`
   - `GITHUB_TOKEN` optional
   - `AI_PROVIDER=gemini`
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL=gemini-2.5-flash`
   - `OPENAI_API_KEY` blank
   - `OPENAI_MODEL` blank or default

If using Railway or Fly.io, deploy the same worker command. The important part
is that the worker stays running continuously and can reach Postgres and Redis.

### 5. Create the GitHub App

GitHub settings:

- App name: `BitSpam` or a unique variant like `BitSpam Demo`.
- Homepage URL: your Vercel production URL.
- Callback URL: `https://YOUR_DOMAIN/api/auth/github/callback`
- Webhook URL: `https://YOUR_DOMAIN/api/github/webhook`
- Webhook secret: a random secret that also goes into `GITHUB_WEBHOOK_SECRET`.
- Enable webhook events.

Minimum permissions for the current app flow:

- Pull requests: read
- Contents: read
- Metadata: read
- Checks: read and write
- Commit statuses: read
- Issues: read and write, for proof-of-work comments and labels

Subscribe to events:

- Pull request

After creating the app:

1. Copy App ID into `GITHUB_APP_ID`.
2. Copy Client ID into `GITHUB_APP_CLIENT_ID`.
3. Generate a Client Secret and set `GITHUB_APP_CLIENT_SECRET`.
4. Generate a private key and set `GITHUB_APP_PRIVATE_KEY`.
5. Install the app on your demo repository.
6. Redeploy web and worker after env changes.

### 6. Smoke test

Run these in order:

1. Open `https://YOUR_DOMAIN/`.
2. Open `/analyze`, paste a public PR URL, submit.
3. Confirm a queued run appears.
4. Confirm the worker logs show `BitSpam worker started` and job completion.
5. Open `/history` and the saved run.
6. Open `/dashboard`, sign in with GitHub, and inspect repo/PR views.
7. Open a PR in your demo repo and confirm:
   - Webhook delivery is 2xx in GitHub App settings.
   - A BitSpam analysis job is queued.
   - A check run appears on the PR.
   - Labels/comment appear when the verdict calls for them.

## Demo repository plan

Create a public demo repo named something like `bitspam-demo-repo`.

Add a small baseline app:

```text
README.md
CONTRIBUTING.md
.github/pull_request_template.md
.bitspam.yml
src/index.ts
src/wallet.ts
tests/index.test.ts
```

Create three branches and PRs.

### Good PR

Branch: `good-pr/add-input-validation`

Intent:

- Clear title.
- PR body links an issue.
- Small scoped diff.
- Includes test evidence.

Example title:

```text
Add input validation for amount parsing
```

Example body:

```markdown
Fixes #1.

This adds explicit validation for amount parsing before values reach wallet
logic. I added tests for empty, negative, and non-numeric inputs.

Test evidence:
- npm test
```

### Weak PR

Branch: `weak-pr/misc-cleanup`

Intent:

- Generic title.
- No linked issue.
- Vague body.
- Touches unrelated files.
- No tests.

Example title:

```text
Update files
```

Example body:

```markdown
Improves the project and fixes some things.
```

### Risky PR

Branch: `risky-pr/change-wallet-and-workflow`

Intent:

- Touches sensitive code and CI.
- Big diff or lockfile churn.
- Weak explanation.
- No test proof.

Example changed paths:

```text
.github/workflows/ci.yml
src/wallet.ts
package.json
pnpm-lock.yaml
```

Example title:

```text
Optimize wallet flow
```

Example body:

```markdown
Small optimization.
```

## Hackathon demo flow

1. Start on the homepage and state the maintainer problem.
2. Paste the Good PR into `/analyze`: show high score and review-ready verdict.
3. Paste the Weak PR: show missing intent, issue link, and test evidence.
4. Paste the Risky PR or open it in GitHub: show risky paths, CI signal, and
   proof-of-work comment.
5. Open `/dashboard`: show repo queue, history, contributor context, risky
   files, findings, and copyable suggested comment.
6. Close with the principle: BitSpam does not punish new contributors. It asks
   for better proof when the PR creates maintainer burden.

## Hackathon submission links

Replace these placeholders before submitting:

- Demo site: `https://YOUR_DOMAIN`
- GitHub repo: `https://github.com/YOUR_USERNAME/bitspam`
- Demo repository: `https://github.com/YOUR_USERNAME/bitspam-demo-repo`
- Video demo: `https://youtube.com/...`

## References

- Vercel Git deployment: https://vercel.com/docs/git/vercel-for-github
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Render background workers: https://render.com/docs/background-workers
- Neon connection strings: https://neon.com/docs/connect/connect-from-any-app
- GitHub App registration: https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app
- Gemini API keys: https://ai.google.dev/gemini-api/docs/api-key

