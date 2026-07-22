# AGENTS.md

## Project direction

This repository is **VYBZ** (npm package `vybz-app`, GitHub `ALaustrup/VYBZ`) — an identity-first music collaboration + sample/project-file exchange network. `VYBZ_MASTERPLAN.md` is the **authoritative source of truth** for the product's trajectory; when it conflicts with the current code or older brand docs, the masterplan wins. The tech stack (Vite/React/Supabase) is intentional (see masterplan §3.1).

## Cursor Cloud specific instructions

### Stack & tooling
- Single-package **Vite 6 + React 18 + TypeScript 5.6 (strict)** SPA/PWA (Tailwind 3, `framer-motion`, `react-router-dom` 6). Package manager: **npm** (`package-lock.json`). Node 20+ (CI uses Node 22). The whole app lives at the repo root (`src/`).
- Run everything from the repo root (there is no `apps/` monorepo layout).

### Commands (defined in `package.json`)
- Dev server: `npm run dev` → http://localhost:5173 (`server.host` is `true`, so it also binds on the LAN IP).
- Lint / type-check: `npm run lint` (this is `tsc --noEmit` — there is no ESLint).
- Build: `npm run build` (`tsc --noEmit && vite build`, output in `dist/`).
- Fresh machines: `npm install` once after clone.

### Runtime behavior / gotchas
- Supabase is **required** to boot the app: set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `.env.local` (copy from `.env.example`). Without them the UI shows a backend-not-configured gate. Do not point VYBZ at MYVYB's Supabase project.
- All secrets (OpenAI, Resend, Stripe, LiveKit, service-role keys) live only in Supabase Edge Functions / server env, never in the client (masterplan §11).
- There is **no automated test framework** in this repo (no `npm test`, no `*.test.*` files). Correctness is enforced by `tsc`/`npm run build` plus manual smoke testing.

### Testing guidance (owner preference)
- Prefer `npm run lint` and `npm run build` (both must pass with zero errors) as the correctness gate unless the user explicitly asks for manual UI smoke testing.
