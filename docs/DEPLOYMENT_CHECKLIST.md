# BitSpam Production Deployment Checklist

Use this as the quick launch checklist when you are trying to get the demo live
fast.

## Required accounts

- GitHub
- Vercel
- Neon or Supabase
- Redis Cloud, Railway Redis, Render Key Value, or Upstash with Redis protocol
- Render, Railway, or Fly.io for the worker
- Google AI Studio for Gemini API key

## Fast path

1. Push the repo to GitHub.
2. Create Postgres and copy `DATABASE_URL`.
3. Create Redis and copy `REDIS_URL`.
4. Generate `BITSPAM_SESSION_SECRET`.
5. Deploy web to Vercel.
6. Set Vercel env vars.
7. Run `corepack pnpm db:push` against production `DATABASE_URL`.
8. Create GitHub App.
9. Add GitHub App env vars to Vercel and worker.
10. Deploy worker.
11. Update GitHub App webhook URL to `https://YOUR_DOMAIN/api/github/webhook`.
12. Install GitHub App on the demo repo.
13. Create Good, Weak, and Risky PRs.
14. Record demo video.

## Env audit

For Vercel web:

```text
DATABASE_URL
REDIS_URL
NEXT_PUBLIC_APP_URL
BITSPAM_SESSION_SECRET
GITHUB_APP_ID
GITHUB_APP_CLIENT_ID
GITHUB_APP_CLIENT_SECRET
GITHUB_APP_PRIVATE_KEY
GITHUB_WEBHOOK_SECRET
GITHUB_TOKEN
AI_PROVIDER
GEMINI_API_KEY
GEMINI_MODEL
OPENAI_API_KEY
OPENAI_MODEL
BITSPAM_DEFAULT_MODE
BITSPAM_ANALYSIS_MODE
BITSPAM_ALLOW_INSECURE_GITHUB_TLS
```

For the fastest free demo, set this in Vercel:

```text
BITSPAM_ANALYSIS_MODE=inline
```

In inline mode, `/analyze` runs directly in the Vercel API route and does not
need a separate paid worker. Keep `REDIS_URL` only if you later switch back to:

```text
BITSPAM_ANALYSIS_MODE=queue
```

For the worker:

```text
DATABASE_URL
REDIS_URL
NEXT_PUBLIC_APP_URL
GITHUB_APP_ID
GITHUB_APP_PRIVATE_KEY
GITHUB_TOKEN
AI_PROVIDER
GEMINI_API_KEY
GEMINI_MODEL
OPENAI_API_KEY
OPENAI_MODEL
```

OpenAI can stay blank for the current Gemini deployment.

## GitHub App settings

Use:

```text
Homepage URL: https://YOUR_DOMAIN
Callback URL: https://YOUR_DOMAIN/api/auth/github/callback
Webhook URL: https://YOUR_DOMAIN/api/github/webhook
Webhook secret: same value as GITHUB_WEBHOOK_SECRET
```

Permissions:

```text
Metadata: read
Contents: read
Pull requests: read
Checks: read and write
Commit statuses: read
Issues: read and write
```

Events:

```text
Pull request
```

## Final smoke tests

- `/` loads.
- `/analyze` queues a public PR.
- Worker logs show job completion.
- `/history` shows saved runs.
- `/dashboard` starts GitHub OAuth and loads after login.
- GitHub App webhook delivery returns 2xx.
- Demo repo PR gets a BitSpam check run.
- Weak/risky PR gets actionable proof-of-work guidance.



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
$env:DATABASE_URL="postgresql://neondb_owner:npg_HI5izOV2WYcK@ep-spring-flower-a8wha9tp-pooler.eastus2.azure.neon.tech/neondb?sslmode=require&channel_binding=require"
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

On Railway, if the worker and Redis are in the same project, add this variable
to the worker service:

```text
REDIS_URL=${{Redis.REDIS_URL}}
```

If your Redis service has a different name, replace `Redis` with that service
name. For example:

```text
REDIS_URL=${{bitspam-redis.REDIS_URL}}
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
