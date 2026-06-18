# BitSpam Hackathon Submission Draft

Use this as copy for the public project page. Replace placeholder links before
submitting.

## Headline

BitSpam: a maintainer attention firewall for noisy pull requests.

## About the project

## Inspiration

Open-source maintainers are being asked to review more low-quality pull
requests than ever: vague fixes, automated edits, unrelated file churn, and PRs
that look plausible but leave maintainers with all the verification work. That
problem is especially painful in high-trust ecosystems like Bitcoin and
cryptocurrency infrastructure, where a tiny risky change can have outsized
consequences.

BitSpam was inspired by a simple idea: maintainers should not have to choose
between being welcoming and protecting their review queue. A serious new
contributor deserves a fair path forward, but a PR that creates maintainer
burden should be asked for proof of work before it consumes scarce attention.

## What it does

BitSpam analyzes GitHub pull requests and produces a maintainer-ready report:

- A 0-100 quality score.
- A verdict such as review ready, needs proof of work, likely low quality, or
  high risk.
- Findings grouped by intent, scope, tests, policy, risk, contributor history,
  CI, spam patterns, and maintainer burden.
- A suggested contributor comment that maintainers can copy or let the GitHub
  App post.
- A dashboard with repository queues, risky files, contributor history, analysis
  history, and saved reports.

It supports two flows:

1. Paste a public GitHub PR URL into the web app for a fast demo analysis.
2. Install the GitHub App so opening a PR automatically queues analysis,
   creates a check run, applies labels, and posts proof-of-work guidance when
   needed.

## How we built it

BitSpam is a TypeScript monorepo with a clean split between the web app, worker,
database, GitHub integration, queue, analyzer, and shared contracts.

The analyzer started with deterministic checks because the public labels should
not depend directly on an LLM. It evaluates intent quality, issue links, PR
template usage, contributing rules, diff scope, test evidence, risky paths, CI
status, contributor history, spam patterns, and maintainer burden. After that,
optional Gemini reasoning adds structured semantic help: whether the PR body
matches the diff, whether the description looks generic, proof-of-work
questions, and a clearer maintainer summary. AI output is validated as
structured JSON and is treated as advisory input, not the final judge.

The production architecture uses:

- Next.js on Vercel for the public site, analyzer UI, dashboard, OAuth, and API
  routes.
- BullMQ and Redis for queued PR analysis.
- A separate worker service for long-running GitHub and AI work.
- Drizzle ORM and Postgres for repositories, pull requests, analysis runs,
  findings, repo policies, webhook events, and proof comments.
- GitHub App authentication, webhook verification, check runs, labels, and
  proof-of-work comments.

## Challenges we faced

The hardest part was balancing automation with fairness. If a system only says
"spam" or "not spam," it can punish new contributors who simply need guidance.
BitSpam instead asks: did this PR explain intent, stay scoped, show test
evidence, respect repository rules, and avoid risky paths? When the answer is
no, the output is a concrete request for better proof rather than a silent
rejection.

Another challenge was keeping GitHub App automation production-shaped while
still building a hackathon demo quickly. We split the system into a synchronous
paste-URL flow for demos, then moved real analysis into a queue and worker so
webhooks stay responsive.

## What we learned

We learned that contribution quality is not a single signal. A small PR from a
first-time contributor can be excellent if it is specific and well-tested. A PR
from an established account can still be risky if it changes wallet logic,
workflows, or lockfiles without evidence. The useful product is not a magic
spam detector. It is a workflow that gives maintainers better defaults and gives
contributors a clear path to earn review.

## What is next

Next steps:

- More repository-specific policy presets for Bitcoin and security-sensitive
  projects.
- Maintainer feedback loops so accepted/rejected PR outcomes improve future
  scoring.
- Better GitHub App setup flow for organizations.
- Team-level dashboard permissions.
- More robust private repo onboarding and audit logs.

## Built with

- TypeScript
- Next.js
- React
- Tailwind CSS
- shadcn/ui style components
- Drizzle ORM
- PostgreSQL
- BullMQ
- Redis
- Octokit
- GitHub Apps and webhooks
- Gemini API
- Zod
- pnpm workspaces
- Turborepo
- Vercel
- Render/Railway/Fly.io compatible worker deployment
- Neon/Supabase compatible Postgres
- Upstash/Redis Cloud/Railway compatible Redis

## Try it out links

- Demo site: `https://YOUR_DOMAIN`
- GitHub repo: `https://github.com/YOUR_USERNAME/bitspam`
- Demo repo: `https://github.com/YOUR_USERNAME/bitspam-demo-repo`
- Video demo: `https://youtube.com/...`

## Project media checklist

Recommended gallery images:

- Homepage screenshot.
- `/analyze` page with a Good PR report.
- `/dashboard` repository queue.
- PR detail page showing risky files and findings.
- GitHub PR check run/comment screenshot.

Recommended video length: 2-3 minutes.

Suggested video outline:

1. Show the spam problem in a weak or risky PR.
2. Paste the PR URL into BitSpam and show the report.
3. Show the dashboard queue and PR detail page.
4. Open the GitHub PR and show the check run/proof-of-work comment.
5. Close with the fairness angle: serious contributors get a path to improve.

