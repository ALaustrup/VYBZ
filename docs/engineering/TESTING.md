# Testing

## Commands

| Script | Purpose |
|--------|---------|
| `npm run lint` | `tsc --noEmit` |
| `npm run test` | Vitest unit/component |
| `npm run test:watch` | Vitest watch |
| `npm run build` | Typecheck + Vite production build |
| `npm run test:e2e` | Build (unless `PLAYWRIGHT_SKIP_BUILD=1`) + Vite preview + Playwright smoke |
| `npm run test:a11y` | Same runner, `e2e/smoke.spec.ts` only |
| `npm run preview:e2e` | Manual preview on `127.0.0.1:4173` (`--strictPort`) |

## Stack (Phase 1)

- **Vitest 3** + jsdom + Testing Library (`vitest.config.ts`, `src/test/setup.ts`)
- **Playwright** (`playwright.config.cjs`, `e2e/smoke.spec.ts`, `scripts/run-e2e.mjs`)
- **CI:** [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — lint, test, build, e2e

## E2E startup contract

`scripts/run-e2e.mjs`:

1. Ensure `dist/` (runs `npm run build` unless `PLAYWRIGHT_SKIP_BUILD=1`)
2. Start `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort`
3. Wait until `http://127.0.0.1:4173/index.html` returns OK (60s timeout)
4. Run Playwright with `PLAYWRIGHT_SKIP_WEBSERVER=1`
5. Always stop the preview process

On preview timeout or Playwright failure, preview stdout/stderr are dumped.

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
