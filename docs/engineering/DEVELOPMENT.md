# Development

> Suite engineering entry. Stack: Vite 6 · React 18 · TypeScript 5.6 strict · Tailwind 3 · npm · Node 20+.

## Setup

1. Clone `ALaustrup/VYBZ`; work on `suite-genesis` for Suite Genesis.
2. Copy `.env.example` → `.env.local` with `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
3. `npm install` · `npm run dev` → http://localhost:5173
4. Never put `service_role` / Stripe / fal / Groq in `VITE_*`.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local SPA |
| `npm run lint` | `tsc --noEmit` (correctness gate) |
| `npm run build` | Typecheck + Vite production build |
| `npm run visuals:encode` / `visuals:upload` | site-visuals CDN |

## Layout

- Root SPA only — no `apps/` monorepo.
- Preserve Music Repos, VDock, flags, storefront, watermark paths (see `AGENTS.md`).
- Media gitignored — serve from Storage CDN.
- Local heavy compute: `tools/vybz-bridge` (VYBZ Engine).

## Conventions

- Additive migrations only; RLS for multi-user tables.
- Feature flags in `src/lib/flags.ts`.
- Prefer browser → Engine → Edge → paid providers.
- Do not expand Spark/dating, Living Home, VR, or Bunny.

See [`TESTING.md`](./TESTING.md), [`FEATURE_FLAGS.md`](./FEATURE_FLAGS.md).
