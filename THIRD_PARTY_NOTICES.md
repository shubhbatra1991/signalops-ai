# Third-Party Dependency Inventory

This repository includes a machine-readable [CycloneDX 1.5 SBOM](SBOM.cdx.json) generated from `package-lock.json` with:

```bash
npm sbom --package-lock-only --omit optional --sbom-format cyclonedx --sbom-type application
```

Regeneration for the landing-page motion enhancement on 2026-10-13 produced 430 dependency components. Optional platform packages are omitted because npm's complete lockfile traversal reported unresolved cross-platform optional/peer relationships; they remain recorded in `package-lock.json` and require separate review for each deployment platform.

## Declared licence metadata

| Licence identifier | Components |
| --- | ---: |
| MIT | 364 |
| Apache-2.0 | 25 |
| ISC | 17 |
| BSD-2-Clause | 9 |
| BSD-3-Clause | 3 |
| MPL-2.0 | 4 |
| BlueOak-1.0.0 | 2 |
| CC0-1.0 | 2 |
| MIT-0 | 2 |
| CC-BY-4.0 | 1 |
| Python-2.0 | 1 |

Direct runtime dependencies declare MIT except `lucide-react` 1.56.0, which declares ISC. `motion` 14.2.0 declares MIT and is used only by the public landing-page presentation layer. Lucide's distributed licence also identifies Feather-derived icons covered by the included MIT notice. Direct development dependencies declare MIT except TypeScript and Playwright, which declare Apache-2.0, and `@axe-core/playwright`, which declares MPL-2.0. Its installed `axe-core` dependency also declares MPL-2.0.

This inventory reflects package metadata and is not a legal opinion, a complete attribution bundle or a statement of licence compliance. Before distribution, qualified review should confirm:

- notice, attribution and source-offer obligations for the actual production dependency graph;
- treatment of MPL-2.0, CC-BY-4.0, Python-2.0 and platform-specific optional packages;
- whether bundled/transpiled output includes additional notice requirements;
- compatibility with any future change from the current MIT project licence.

No third-party licence text or package source has been copied into this repository by this documentation stage.

## Security inventory note

On 2026-10-12, `npm audit --omit=dev --json` reported zero known production dependency vulnerabilities. The full development graph reported five high-severity affected package entries, all tracing through `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob`/`micromatch` → `braces` and advisory `GHSA-vfj7-8cjw-p6xm` (stack exhaustion from deeply nested patterns).

npm proposed downgrading `eslint-config-next` to 14.2.35 as a semver-major fix, which is incompatible with the installed Next.js 16.4 toolchain and was not applied. Maintainers should monitor for a compatible upstream resolution and treat untrusted lint glob patterns as a development-tooling risk. This snapshot can become stale and should be regenerated for each release.
