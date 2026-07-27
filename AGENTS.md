# AGENTS.md

## Project direction

This repository is **VYBZ** (npm package `vybz-app`, GitHub `ALaustrup/VYBZ`) — an
**identity-first, vibes-based genuine connection platform** owned by **Astra Matrix, Inc.**
Canonical domain: **`vybz.cloud`**.

VYBZ matches real people for romance, friendship, meetup/activity partnership, creative
collaboration, and professional fit under one durable identity. Create/pro tools (music-led
depth, drops, Studio, exchange) remain a coequal pillar — not the only door. Connection
(matching, DMs, cam, voice) stays free forever; primary monetization is optional cosmetics.

Authoritative sources of truth (in order when they conflict):

1. [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) — product + engineering trajectory (**Vibes** doctrine)
2. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — technical map
3. [`SECURITY.md`](./SECURITY.md) — threat model + hard rules
4. [`VERSIONING.md`](./VERSIONING.md) — Alpha / Beta release labels + SemVer twin
5. [`IDEAS_BACKLOG.md`](./IDEAS_BACKLOG.md) — parked ideas between phases
6. [`CHANGELOG.md`](./CHANGELOG.md) — shipped release notes

**Current release label:** read `package.json` → `vybz.release` (Beta-0B line).  
**Doctrine target:** Vibes expansion toward **Beta-1A** per the masterplan.

Hard laws (see masterplan §2): no anonymity, no ads, no connection paywalls, no
pay-to-win match ranking, safety never paid.

## Cursor Cloud specific instructions

### Stack & tooling
- Single-package **Vite 6 + React 18 + TypeScript 5.6 (strict)** SPA/PWA (Tailwind 3,
  `framer-motion`, `react-router-dom` 6). Package manager: **npm** (`package-lock.json`).
  Node 20+ (CI uses Node 22). The whole app lives at the repo root (`src/`).
- Run everything from the repo root (there is no `apps/` monorepo layout).
- **Git remotes:** only `origin` → `ALaustrup/VYBZ`. Do not add an `upstream` to any legacy fork.

### Commands (defined in `package.json`)
- Dev server: `npm run dev` → http://localhost:5173 (`server.host` is `true`, so it also binds on the LAN IP).
- Lint / type-check: `npm run lint` (this is `tsc --noEmit` — there is no ESLint).
- Build: `npm run build` (`tsc --noEmit && vite build`, output in `dist/`).
- Fresh machines: `npm install` once after clone.

### Runtime behavior / gotchas
- Supabase is **required** to boot the app: set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
  in `.env.local` (copy from `.env.example`). Without them the UI shows a backend-not-configured gate.
- **Production Supabase project ref:** `xixmneooyufbeftdfpcm` (this **is** VYBZ). Point
  local/preview env at that project (or a dedicated VYBZ staging project) — never at an
  unrelated legacy app’s database.
- All secrets (OpenAI, Resend, Stripe, LiveKit, service-role keys) live only in Supabase
  Edge Functions / server env, never in the client (masterplan §14).
- Shell chrome is a **full-bleed bottom V-Dock** + global player on all viewports (no desktop
  side rail). Widgets and surfaces must stay usable for Love/Meetup and Social users, not
  only creators.
- There is **no automated test framework** in this repo (no `npm test`, no app `*.test.*`
  files). Correctness is enforced by `tsc`/`npm run build` plus manual smoke testing.

### React chunking (do not regress)
Vite `manualChunks` must keep **`react`, `react-dom`, `scheduler`, and `react-router(-dom)`
together** (currently in the shared `vendor` chunk). Parking `scheduler` alone away from
React crashes production with `Cannot set properties of undefined (setting 'unstable_now')`
and yields a blank dark screen on `vybz.cloud`.

### Testing guidance (owner preference)
- Prefer `npm run lint` and `npm run build` (both must pass with zero errors) as the
  correctness gate unless the user explicitly asks for manual UI smoke testing.
- During the Vibes pivot, do not treat creator-collab-only UX as the final product shape;
  follow `VYBZ_MASTERPLAN.md` when inherited UI conflicts with the doctrine.
