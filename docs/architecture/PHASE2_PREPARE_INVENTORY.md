# Phase 2 — Prepare MVP inventory

Branch: `suite-genesis`.

## Packages

| Package | Path |
|---------|------|
| Domain | `packages/domain/releases` → `@vybz/domain/releases` |
| Data | `packages/data/releases` → `@vybz/data/releases` |
| Processing | `packages/processing/readiness` → `@vybz/processing/readiness` |

## App feature

| File | Role |
|------|------|
| `src/features/prepare/service.ts` | Hybrid local/remote repo + mutation queue |
| `src/features/prepare/probeClient.ts` | Worker client |
| `src/features/prepare/readiness.worker.ts` | Vite worker entry |
| `src/features/prepare/ReleasesPage.tsx` | `/releases` |
| `src/features/prepare/NewReleasePage.tsx` | `/releases/new`, `/start` |
| `src/features/prepare/ReleaseDetailPage.tsx` | `/release/:id` |
| `src/features/prepare/PrepareLocalApp.tsx` | Unsigned / no-backend Prepare shell |

## Database

- Up: `supabase/migrations/20260728_0081_release_projects.sql`
- Down: `supabase/migrations/20260728_0081_release_projects.down.sql`
- Applied on linked project via `supabase db query` (history repair still needed for `db push`)

## Tests

- Domain readiness unit tests
- Local repository tests
- Worker fixture tests
- RLS SQL contract tests
- Playwright: `e2e/prepare.spec.ts`
