# Security Policy

## Supported scope

SignalOps-AI does not yet publish versioned stable releases or a long-term support schedule. Security work currently targets the latest maintained repository state. Older commits and self-hosted modifications are not supported releases.

The current application is a fictional-data demonstration. It has no authentication, production customer-data ingestion or database. These absences are security boundaries and product limitations, not assurances that the application is ready for untrusted production data.

## Reporting a vulnerability

A verified private reporting destination has not yet been approved. The repository owner must approve and publish either GitHub private vulnerability reporting or a dedicated security contact before a public release process can be considered complete.

Until that destination exists:

- Do not place credentials, personal data, customer data, exploit details or other sensitive material in a public GitHub issue.
- Do not test against infrastructure you do not own or have explicit permission to assess.
- A non-sensitive public issue may ask the maintainer to establish a private contact, but should not disclose the vulnerability.

This section intentionally does not invent an email address or promise a response time.

## Deployment trust boundaries

- `public-demo` is the default deployment mode. Real provider requests are rejected server-side by both AI POST endpoints.
- AI requests are permitted only when the server validates `SIGNALOPS_DEPLOYMENT_MODE=self-hosted` together with `AI_ENABLE_PROVIDER_REQUESTS=true`.
- The AI endpoints have no user authentication. Same-origin checks reduce browser cross-origin abuse but do not authenticate direct HTTP clients.
- Request budgets are process-local. They reset on restart and multiply across replicas, so they are not a distributed denial-of-service or spending control.
- Production operators must add trusted ingress restrictions, provider spending limits, monitoring and an HTTPS deployment edge.
- HSTS is intentionally left to the HTTPS edge because local and self-hosted HTTP development must continue to work. Configure HSTS only after hostname, redirect and subdomain policy is settled.
- The application emits a nonce-based Content Security Policy and restrictive frame, MIME, referrer, permissions and cross-origin headers. Operators must re-evaluate the policy when adding remote assets or integrations.

## BYOK key handling

Browser-entered keys are held in React memory for the current application session. They are not intentionally written to localStorage, sessionStorage, cookies, URLs or browser databases. Disconnect, full reload and page hide clear the in-memory session.

Environment credentials use only server-side variables: `OPENAI_API_KEY`, `GROQ_API_KEY`, `ANTHROPIC_API_KEY` or `ZAI_API_KEY`. They must never use a `NEXT_PUBLIC_` prefix. Configuration responses expose only provider/model and enablement state, never credential values.

AI routes do not intentionally log credentials, authorization headers, prompts, evidence or provider response bodies. Safe diagnostics contain bounded identifiers, categories and provider metadata. Browser extensions, the host operating system, reverse proxies and the selected provider remain part of the operator's trust boundary.

## Evidence and provider requests

Connection tests use a fixed synthetic prompt. Insight generation requires a preview, a short-lived evidence ticket and explicit approval. The demonstration evidence is fictional, but provider privacy, retention, billing and regional terms still apply.

Do not connect real customer data until authentication, authorization, data minimization, privacy review, provider configuration and retention policy have been designed and approved.

## Self-hosted operator responsibilities

- Keep Node.js, npm and dependencies patched.
- Store `.env.local` and deployment secrets outside source control with least-privilege access.
- Use HTTPS and set `AI_APP_ORIGIN` to the exact deployed origin.
- Keep public-demo mode for public showcases unless authenticated abuse and spending controls exist.
- Configure reverse-proxy body/time limits and distributed rate limiting when AI is enabled.
- Apply provider account budgets and review provider data-handling terms.
- Review logs, backups, browser extensions and host access for secret exposure.
- Re-run lint, typecheck, tests and the production build after configuration or dependency changes.
