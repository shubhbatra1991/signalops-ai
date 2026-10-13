# SignalOps-AI

SignalOps-AI is a public, self-hostable customer and product intelligence demonstration. It connects deterministic product-event analytics, onboarding funnels and fictional customer feedback to evidence-grounded AI research, editable product missions and cautious before/after measurement.

The repository is currently a **demo-first application**. All bundled customers, events and feedback are fictional. It does not ingest production customer data, provide authentication, offer shared cloud workspaces or claim production SaaS readiness.

## What works today

- A public landing page and optional guided tour through the evidence-to-action workflow.
- A versioned fictional SaaS dataset with stable IDs and UTC timestamps.
- Deterministic event counts, unique-customer counts and date filtering.
- Ordered funnel progression, conversion and drop-off calculations with visible methodology.
- Searchable and filterable fictional feedback, recurring themes and linked behavioural context.
- Optional evidence-grounded AI research through OpenAI, Groq, Anthropic or Z.ai using your own key.
- Explicit evidence review and approval before every insight-generation request.
- Browser-local Product Missions with editing, status transitions and evidence provenance.
- Mission impact evaluations using compatible UTC windows, with completion kept separate from measured success.
- Responsive Light, Dark and time-based Auto appearance modes with six accent choices.
- A nonce-based Content Security Policy and a fail-closed public deployment mode.

Open the guest application at `/demo`. The working sections are `/demo/events`, `/demo/funnels`, `/demo/feedback`, `/demo/insights`, `/demo/missions`, `/demo/impact` and `/demo/settings`. Legacy `/app` links redirect to their `/demo` equivalents and preserve query parameters. Authenticated workspaces are reserved under `/w/[workspaceSlug]` but remain unavailable until server-side authentication and membership checks are implemented.

## Product preview

The landing page at `/` includes a server-rendered preview calculated from the same fictional dataset used by the application. No product screenshot is currently checked into the repository; the SVG files in `public/` are framework placeholders and are not presented as product images.

## Current limitations

- PostgreSQL, Prisma, Docker and authentication are not part of the current runtime.
- There is no real event or feedback ingestion endpoint.
- Projects and demonstration analytics are read-only.
- Missions and their evaluation history use versioned browser-local storage. They are not shared or backed up.
- Browser-entered AI keys live in application memory only and clear on full reload, page hide or disconnect.
- AI endpoints are unauthenticated when explicitly enabled. Origin checks and process-local limits are useful browser safeguards, not complete protection against direct clients or distributed abuse.
- Rate limits reset on restart and multiply across server replicas.
- No generated insight is a verified product fact. Application-controlled analytics remain authoritative.

## Requirements

- Node.js `>=24.15.0 <25`. The complete toolchain is verified with Node.js `24.19.0`.
- npm 10 or newer. The current verification environment uses npm `11.6.2`.
- Git for cloning the repository.

The Node.js range is stricter than Next.js alone because the installed test and DOM tooling requires the Node 24.15 or newer line.

## Local installation

```bash
git clone https://github.com/shubhbatra1991/signalops-ai.git
cd signalops-ai
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The application starts in public-demo mode and requires no database or AI key.

Environment configuration is optional for the deterministic demo. To create a local configuration file:

```bash
# macOS/Linux
cp .env.example .env.local

# PowerShell
Copy-Item .env.example .env.local
```

Never commit `.env.local` or a real provider credential.

For a production-mode local build:

```bash
npm run build
npm run start
```

## Deployment modes and AI configuration

Provider requests are disabled unless the server receives both of these exact values:

```dotenv
SIGNALOPS_DEPLOYMENT_MODE=self-hosted
AI_ENABLE_PROVIDER_REQUESTS=true
```

| Mode | Configuration | Behavior |
| --- | --- | --- |
| Public demonstration | Defaults, or `SIGNALOPS_DEPLOYMENT_MODE=public-demo` | Both AI POST endpoints reject provider requests server-side. Deterministic features continue to work. |
| Hosted foundation | `hosted` and `AI_ENABLE_PROVIDER_REQUESTS=false` | Guest features work; all provider requests remain disabled until authenticated workspace authorization exists. |
| Self-hosted without AI | `self-hosted` and `AI_ENABLE_PROVIDER_REQUESTS=false` | Analytics and local workflows work; provider requests remain disabled. |
| Self-hosted BYOK | `self-hosted` and `AI_ENABLE_PROVIDER_REQUESTS=true` | Browser-memory keys may be used. Server credentials require additional explicit flags described below. |

Unknown values and attempts to enable provider requests in `public-demo` or `hosted` mode fail closed. Hiding controls in the browser is not the security boundary; both AI endpoints enforce this policy on the server.

### Supported provider allowlist

| Provider | Model ID | Server credential variable |
| --- | --- | --- |
| OpenAI | `gpt-4.1-mini` | `OPENAI_API_KEY` |
| Groq | `openai/gpt-oss-20b` | `GROQ_API_KEY` |
| Anthropic | `claude-sonnet-4-6` | `ANTHROPIC_API_KEY` |
| Z.ai | `glm-4.7` | `ZAI_API_KEY` |

Model IDs are exact allowlisted values. There is no silent model or provider fallback. Availability, billing, retention and regional terms belong to the selected provider and account.

For an operator-managed server credential, also configure `AI_PROVIDER`, `AI_MODEL` and the matching key variable. Set `AI_ALLOW_SERVER_KEY_TESTS=true` to permit explicit synthetic connection tests and `AI_ALLOW_SERVER_KEY_INSIGHTS=true` to permit individually reviewed insight requests. Both default to disabled. Set `AI_APP_ORIGIN` to the exact HTTPS application origin for a non-local deployment.

See [.env.example](.env.example) for a sanitized template and [SECURITY.md](SECURITY.md) for trust boundaries. Public internet hosting with AI enabled still requires ingress controls, provider spending limits and monitoring.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Generate Next.js route types and run strict TypeScript checking. |
| `npm test` | Run the Vitest suite once. External AI providers are mocked. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run e2e` | Run Playwright in Chromium, Firefox and WebKit against an isolated public-demo production server. |
| `npm run e2e:chromium` | Run functional and automated accessibility coverage in Chromium. |
| `npm run e2e:a11y` | Run the Axe WCAG A/AA-related scans in Chromium. |
| `npm run e2e:ui` | Open Playwright's local interactive runner. |
| `npm run build` | Create a production build. |
| `npm run start` | Serve an existing production build. |

No test command intentionally makes a paid provider request.

## Repository structure

```text
app/                 Next.js App Router pages, layouts and AI route handlers
domain/analytics/    Pure deterministic analytics functions
features/            Feature-oriented domain and presentation modules
server/ai/           Server-only provider adapters, validation and safety boundaries
server/modules/demo/ Fictional dataset and read/application services
server/security/     CSP and shared security-header policy
public/              Static public assets
```

Private product specifications under `docs/`, local agent instructions and `.env*` files are intentionally excluded from Git. They are not public product documentation.

## Security

Read [SECURITY.md](SECURITY.md) before enabling AI on an internet-accessible deployment. A verified private vulnerability-reporting destination still requires maintainer approval; do not include credentials or customer data in public issues.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local checks, PR expectations and contribution/licensing considerations.

## Dependencies

[SBOM.cdx.json](SBOM.cdx.json) is a CycloneDX inventory generated from `package-lock.json`. [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) summarizes the current licence metadata and review limitations.

## Licensing

SignalOps-AI is currently distributed under the [MIT License](LICENSE), which permits commercial use, modification, redistribution, and hosting subject to its terms.

We are evaluating alternative licensing arrangements for future releases, including separate commercial licensing for certain hosted or redistributed offerings. No additional commercial restrictions apply to the existing MIT-licensed release.
