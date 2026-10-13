# Contributing to SignalOps-AI

SignalOps-AI is currently a demo-first Next.js application. Contributions should preserve deterministic analytics, fictional-data labelling, evidence traceability and the server-side AI safety boundaries.

## Local setup

Use Node.js `>=24.15.0 <25` and npm 10 or newer.

```bash
git clone https://github.com/shubhbatra1991/signalops-ai.git
cd signalops-ai
npm ci
npm run dev
```

The default public-demo configuration needs no `.env` file, database or AI credential. Copy `.env.example` to `.env.local` only when testing configuration behavior. Never commit a real key.

## Engineering conventions

- Keep TypeScript strict and validate all external inputs.
- Keep deterministic analytics independent from UI, AI output and storage adapters.
- Treat application-calculated observations and metrics as authoritative. AI may propose research hypotheses and actions, but may not invent metrics or evidence IDs.
- Keep server-only modules out of browser bundles and never expose credentials through `NEXT_PUBLIC_` variables.
- Preserve project/date scope and existing evidence provenance.
- Use semantic design tokens, accessible names, visible focus and responsive layouts.
- Avoid new dependencies unless the requirement and maintenance cost are demonstrated.
- Use fictional fixtures only. Do not submit real customer records, credentials or private internal documents.

## Required checks

Before opening a pull request, run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run e2e
git diff --check
```

The E2E command starts an isolated production server in fail-closed public-demo mode. Install the managed desktop browser engines once with `npx playwright install chromium firefox webkit`. Axe scans run through the Chromium project and supplement, rather than replace, manual accessibility review. External AI providers must be mocked in automated tests. Do not include paid calls, production keys or provider response payloads in fixtures.

## Pull requests

1. Create a focused branch from the current default branch.
2. Keep the change limited to one clear problem.
3. Add meaningful tests for changed behavior, security boundaries or analytics semantics.
4. Explain the trigger, resulting behavior, validation performed and material limitations.
5. Link the relevant issue when one exists.
6. Confirm that no private `docs/`, agent instructions, `.env` files or generated build outputs are staged.

Maintainers may request accessibility, browser, security or provider-contract evidence when automated checks cannot cover the change.

## Bug reports

Include the affected route, expected and observed behavior, reproduction steps, Node/npm versions and whether the issue occurs in development or a production build. Use fictional or redacted inputs.

Do not disclose a security vulnerability or secret in a public issue. Follow [SECURITY.md](SECURITY.md); the private reporting destination is still awaiting owner approval.

## Licensing and contributor rights

The repository currently uses the [MIT License](LICENSE). Contributions accepted into this repository are published under the repository's operative licence unless an explicit, legally reviewed agreement says otherwise.

Only submit work you have the right to contribute. Identify third-party code, generated assets or copied material and its licence in the pull request. No Contributor Licence Agreement has been adopted or promised. Because the maintainer is considering a different licence for future releases, contributor ownership and any future relicensing process require qualified legal review before such a change.
