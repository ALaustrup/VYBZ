# Testing

> Phase 1 foundation. Until landed, correctness gate remains `npm run lint` && `npm run build`.

## Planned stack

| Layer | Tool | Scope |
|-------|------|-------|
| Unit / component | **Vitest** + Testing Library | Pure libs, flags, cost estimate helpers, Suite shell |
| E2E | **Playwright** | Critical paths: Enter, upload smoke, artist page, VDock, tip (mock), live token fail-soft |
| CI | GitHub Actions | lint · build · unit · e2e (smoke) on PR |

## Priority cases (Beta-1A)

1. Route manifest / Suite shell placeholders render.
2. Feature flags default safely (Bunny audio off; storefront/repos as intended).
3. Cost reservation helpers reject unbounded calls.
4. RLS-sensitive client paths do not assume service role.
5. PWA update does not forever-cache `index.html`.

## Rules

- No live paid provider calls in CI (fal/Groq/Stripe) — mock or skip.
- No exploit PoCs; defensive tests only.
- Flaky e2e against shared prod Supabase → prefer local/branch or recorded fixtures.

Track progress in Phase 1 commit notes / CHANGELOG. Companion: [`DEVELOPMENT.md`](./DEVELOPMENT.md).
