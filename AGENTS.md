# AGENTS.md

## Project direction

This repository is **VYBZ** (`vybz-app`) — an identity-first creator social,
collaboration, and precision-matchmaking platform owned by **Astra Matrix, Inc.**
Canonical domain: **`vybz.cloud`**.

Authoritative sources of truth (in order when they conflict):

1. [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) — product + engineering trajectory
2. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — technical map
3. [`SECURITY.md`](./SECURITY.md) — threat model + hard rules
4. [`IDEAS_BACKLOG.md`](./IDEAS_BACKLOG.md) — parked ideas between phases

## Cursor Cloud specific instructions

### Stack & tooling

- Single-package **Vite 6 + React 18 + TypeScript 5.6 (strict)** SPA/PWA
  (Tailwind 3, `framer-motion`, `react-router-dom` 6). Package manager: **npm**.
  Node 20+ (CI uses Node 22). App lives at the repo root (`src/`).
- Run all commands from the **repo root** — there is no monorepo `apps/` layout.

### Commands (`package.json`)

- Dev server: `npm run dev` → http://localhost:5173 (`server.host: true`).
- Lint / type-check: `npm run lint` (`tsc --noEmit` — no ESLint).
- Build: `npm run build` (`tsc --noEmit && vite build` → `dist/`).

### Runtime behavior / gotchas

- Backend is optional for local UI work: without `VITE_SUPABASE_URL` +
  `VITE_SUPABASE_ANON_KEY` the app runs in a limited offline/demo mode.
  Production uses the VYBZ Supabase project (`xixmneooyufbeftdfpcm`).
- Secrets (OpenAI, Resend, Stripe, LiveKit, service-role) live only in Supabase
  Edge Functions / server env — never in the client (masterplan §11).
- There is **no automated test framework**. Correctness gate: `npm run lint` and
  `npm run build` must pass with zero errors, plus targeted manual smoke when
  touching auth, media, matchmaking, or payments.

### React chunking (do not regress)

Vite `manualChunks` must keep **`react`, `react-dom`, `scheduler`, and
`react-router(-dom)` together** (currently in the shared `vendor` chunk).
Parking `scheduler` alone away from React crashes production with
`Cannot set properties of undefined (setting 'unstable_now')` and yields a
blank dark screen on `vybz.cloud`.
