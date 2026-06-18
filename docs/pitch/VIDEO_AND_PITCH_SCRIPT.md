# BitSpam Video And Pitch Script

Use this for a 2-3 minute hackathon demo video or live presentation.

## 30-second version

BitSpam helps open-source maintainers stop low-quality and AI-generated pull
request spam without punishing serious new contributors. It analyzes PR intent,
scope, test evidence, risky files, CI, contributor history, spam patterns, and
maintainer burden. The output is a score, verdict, findings, and a suggested
proof-of-work comment. Maintainers can paste a public PR URL for a quick demo,
or install the GitHub App so new PRs automatically create check runs, labels,
and proof-of-work guidance.

## 2-3 minute demo script

### 1. Problem

"Open-source maintainers are increasingly getting PRs that look plausible but
do not contain enough proof to review safely. The real bottleneck is not just
spam detection. It is maintainer attention."

Show:

- Hackathon prompt.
- Demo repo with Good, Weak, and Risky PRs.

### 2. Homepage

"BitSpam is a maintainer attention firewall. It does not automatically reject
people. It asks whether a PR gives maintainers enough signal to justify review."

Show:

- `https://YOUR_DOMAIN/`
- The homepage positioning.

### 3. Paste URL analysis

"For a fast demo, I can paste any public GitHub PR URL."

Show:

- `/analyze`
- Paste the Good PR URL.
- Point out score, verdict, findings, score breakdown, and contributor comment.

Say:

"A clear PR with an issue link, scoped diff, and test evidence gets a good
score and a review-ready path."

### 4. Weak PR

Paste the Weak PR URL.

Say:

"This one is not treated as malicious. It is treated as incomplete. BitSpam
asks the contributor for concrete proof: explain the intent, link an issue,
describe tests, and narrow the diff."

### 5. Risky PR

Paste or open the Risky PR.

Say:

"This PR touches sensitive paths and workflow/package files with a weak body.
That is exactly where maintainers need the system to slow things down before
deep review."

### 6. Dashboard

Open `/dashboard`.

Say:

"The dashboard is the maintainer console: repo queue, scores, verdicts,
findings, risky files, contributor history, copyable comments, and saved
analysis history."

### 7. GitHub App automation

Open the GitHub PR.

Say:

"When installed as a GitHub App, BitSpam receives pull_request webhooks, creates
a check run, queues analysis in BullMQ, the worker saves the result, then the
app can apply labels and post a proof-of-work comment."

### 8. Closing

"The principle is fairness with friction. Good PRs move faster. Weak PRs get a
clear improvement path. Risky PRs get escalated before maintainers burn scarce
review time."

## Slide talk track

### Slide 1: Stop PR spam without closing the door

Introduce BitSpam as a maintainer attention firewall. Name the hackathon prize
and the three-PR demo structure.

### Slide 2: The problem is plausible review noise

Emphasize that modern spam can look polite and AI-written. The cost is the time
maintainers spend reconstructing intent and verifying safety.

### Slide 3: BitSpam produces a decision packet

Explain score, verdict, findings, and maintainer action. Stress that BitSpam
does not replace maintainers.

### Slide 4: Production architecture

Walk through Vercel web, Postgres, Redis/BullMQ, worker, and GitHub App. Mention
that webhook requests stay fast because analysis happens in the worker.

### Slide 5: Three PR demo

Good PR should pass, Weak PR should request proof, Risky PR should be escalated.

### Slide 6: Deployment

List the managed services: Vercel, Render/Railway/Fly.io, Neon/Supabase, Redis,
Gemini, GitHub App webhook URL.

### Slide 7: Q&A

Use this as your safety slide for judge questions.

## Likely judge questions and answers

### Does AI decide whether a contributor is spam?

No. Public labels and verdicts are based on deterministic analyzer checks. AI
adds structured reasoning, proof-of-work questions, and maintainer summaries.
The AI output is validated and advisory.

### How do you avoid punishing first-time contributors?

BitSpam does not score someone down just because they are new. It looks at
whether the PR provides enough signal: intent, scope, tests, issue context, CI,
and repository policy. A first-time contributor can get a strong score with a
clear, scoped, well-tested PR.

### Can this work on private repos?

Yes. Public paste URL analysis is public-first, but private repo support is
handled through GitHub App installation tokens. Once installed on a private
repo, BitSpam can fetch PR context using installation auth.

### What happens if GitHub rate limits public requests?

The app supports an optional `GITHUB_TOKEN` environment variable. That improves
rate limits for paste-URL analysis without exposing secrets to the frontend.

### Why not auto-close bad PRs?

Auto-close is too aggressive for a maintainer-friendly tool. The default mode
is advisory: score the PR, explain the findings, and request proof of work.
Repository policy can become stricter later, but the demo intentionally keeps
humans in control.

### Why use a queue and worker?

GitHub webhooks should return quickly. Analysis can involve multiple GitHub API
calls and optional AI reasoning, so it belongs in a background worker. BullMQ
plus Redis gives retries, async processing, and a clear path to scale.

### What makes this relevant to Bitcoin/open-source maintainers?

Bitcoin and security-sensitive projects care deeply about review attention and
risky paths. BitSpam flags workflow changes, wallet/security/crypto paths,
lockfile churn, missing tests, weak PR descriptions, and high maintainer burden
before a reviewer spends deep time.

### What is the moat or future direction?

The strong future version is repository-specific policy plus feedback loops.
Maintainers can tune protected paths, required evidence, and proof-of-work
questions. Over time, accepted/rejected outcomes can improve scoring without
making AI the final authority.

### What if a spammer writes a good PR body?

Then the body alone is not enough. BitSpam also evaluates diff scope, changed
paths, tests, CI, linked issues, contributor history, comments, and repository
rules. The goal is not perfect identity judgment. The goal is to force enough
useful proof into the PR before maintainer attention is spent.

