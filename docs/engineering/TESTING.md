# Testing

## Commands

| Script | Purpose |
|--------|---------|
| `npm run lint` | `tsc --noEmit` |
| `npm run test` | Vitest unit/component |
| `npm run test:watch` | Vitest watch |
| `npm run build` | Typecheck + Vite production build |
| `npm run test:e2e` | Playwright smoke |
| `npm run test:a11y` | Playwright a11y smoke subset |

## Stack (Phase 1)

- **Vitest 3** + jsdom + Testing Library (`vitest.config.ts`, `src/test/setup.ts`)
- **Playwright** (`playwright.config.ts`, `e2e/smoke.spec.ts`)
- **CI:** [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — lint, test, build, e2e

## Priority coverage

1. Design tokens / route manifest / provider health (Bunny disabled)
2. UI primitives (Button, StateView)
3. Suite shell placeholders (manual + route smoke)
4. Cost helpers refuse unpaid fal by default
5. PWA `index.html` / landing still loads without secrets

## Rules

- No live paid providers in CI.
- Do not enable Bunny audio flag in tests.
- Keep storefront WIP out of foundation commits until migrated.
