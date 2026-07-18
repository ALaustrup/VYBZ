# AGENTS.md

## Project direction

This repository's technical package name is `vyb-audio`, but it is **being redirected from the inherited MYVYB social app toward VYBZ** — a next-generation music collaboration + sample/project-file exchange network. `VYBZ_MASTERPLAN.md` is the **authoritative source of truth** for the product's trajectory; when it conflicts with the current code or older brand docs, the masterplan wins. The tech stack and build tooling are intentionally kept identical to the inherited base (see masterplan §3.1), so the development environment below is stable across the pivot.

## Cursor Cloud specific instructions

### Stack & tooling
- Single-package **Vite 6 + React 18 + TypeScript 5.6 (strict)** SPA/PWA (Tailwind 3, `framer-motion`, `react-router-dom` 6). Package manager: **npm** (`package-lock.json`). Node 20+ (CI uses Node 22). The whole app lives at the repo root (`src/`).
- The README's `cd apps/veiled` instruction is **stale** — there is no `apps/` directory; run everything from the repo root.

### Commands (defined in `package.json`)
- Dev server: `npm run dev` → http://localhost:5173 (`server.host` is `true`, so it also binds on the LAN IP).
- Lint / type-check: `npm run lint` (this is `tsc --noEmit` — there is no ESLint).
- Build: `npm run build` (`tsc --noEmit && vite build`, output in `dist/`).
- The dependency install (`npm install`) is handled automatically by the Cloud startup update script; you normally do not need to run it manually.

### Runtime behavior / gotchas
- The app runs **fully in a local/offline demo mode with zero backend** — it seeds demo data and gates only multi-user features behind Supabase. Backend is optional: set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `.env.local` (copy from `.env.example`) to enable multi-user mode. Do not point VYBZ at MYVYB's Supabase project.
- All secrets (OpenAI, Resend, Stripe, LiveKit, service-role keys) live only in Supabase Edge Functions / server env, never in the client (masterplan §11).
- There is **no automated test framework** in this repo (no `npm test`, no `*.test.*` files). Correctness is enforced by `tsc`/`npm run build` plus manual smoke testing.

### Testing guidance (owner preference)
- VYBZ is **early in its pivot**; the currently-running inherited MYVYB components are **not** the target trajectory. Per the project owner, **skip manual/component testing of the current features** unless explicitly asked — they are unlikely to be useful and are expected to be replaced. Rely on `npm run lint` and `npm run build` (both must pass with zero errors) as the correctness gate for changes.
