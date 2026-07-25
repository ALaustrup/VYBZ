# AGENTS.md

## Project direction

This repository is **VYBZ** (npm package `vybz-app`, GitHub `ALaustrup/VYBZ`) — an identity-first collaboration + creative-exchange network for **all creators**, with deep focus on music tools and concepts, owned by **Astra Matrix, Inc.** Canonical domain: **`vybz.cloud`**. Do not treat the product as music/audio-exclusive; V-Dock widgets and matchmaking surfaces should stay open to any creative craft.

Authoritative sources of truth (in order when they conflict):

1. [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) — product + engineering trajectory
2. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — technical map
3. [`SECURITY.md`](./SECURITY.md) — threat model + hard rules
4. [`VERSIONING.md`](./VERSIONING.md) — Alpha / Beta-0A release labels + SemVer twin
5. [`IDEAS_BACKLOG.md`](./IDEAS_BACKLOG.md) — parked ideas between phases
6. [`CHANGELOG.md`](./CHANGELOG.md) — shipped release notes

**Current release label:** read `package.json` → `vybz.release` (now **Beta-0B.1**).

## Cursor Cloud specific instructions

### Stack & tooling
- Single-package **Vite 6 + React 18 + TypeScript 5.6 (strict)** SPA/PWA (Tailwind 3, `framer-motion`, `react-router-dom` 6). Package manager: **npm** (`package-lock.json`). Node 20+ (CI uses Node 22). The whole app lives at the repo root (`src/`).
- Run everything from the repo root (there is no `apps/` monorepo layout).
- **Git remotes:** only `origin` → `ALaustrup/VYBZ`. Do not add an `upstream` to any legacy fork.

### Commands (defined in `package.json`)
- Dev server: `npm run dev` → http://localhost:5173 (`server.host` is `true`, so it also binds on the LAN IP).
- Lint / type-check: `npm run lint` (this is `tsc --noEmit` — there is no ESLint).
- Build: `npm run build` (`tsc --noEmit && vite build`, output in `dist/`).
- Fresh machines: `npm install` once after clone.

### Runtime behavior / gotchas
- Supabase is **required** to boot the app: set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `.env.local` (copy from `.env.example`). Without them the UI shows a backend-not-configured gate.
- **Production Supabase project ref:** `xixmneooyufbeftdfpcm` (this **is** VYBZ). Point local/preview env at that project (or a dedicated VYBZ staging project) — never at an unrelated legacy app’s database.
- All secrets (OpenAI, Resend, Stripe, LiveKit, service-role keys) live only in Supabase Edge Functions / server env, never in the client (masterplan §11).
- Shell chrome is a **full-bleed bottom V-Dock + Orb** on all viewports (no desktop side rail). Reactivity is Orb-first (`OrbSphere`); intensity prefs are Off / Soft / VYBZ Max. Widgets may serve any creative workflow — music-led defaults are not a ceiling.
- There is **no automated test framework** in this repo (no `npm test`, no app `*.test.*` files). Correctness is enforced by `tsc`/`npm run build` plus manual smoke testing.

### React chunking (do not regress)
Vite `manualChunks` must keep **`react`, `react-dom`, `scheduler`, and `react-router(-dom)` together** (currently in the shared `vendor` chunk). Parking `scheduler` alone away from React crashes production with `Cannot set properties of undefined (setting 'unstable_now')` and yields a blank dark screen on `vybz.cloud`.

### Testing guidance (owner preference)
- Prefer `npm run lint` and `npm run build` (both must pass with zero errors) as the correctness gate unless the user explicitly asks for manual UI smoke testing.
