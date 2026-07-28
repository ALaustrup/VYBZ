# AGENTS.md

## Project direction

This repository is **VYBZ** (npm package `vybz-app`, GitHub `ALaustrup/VYBZ`) —
**SoundCloud × Spotify × Twitch** under one durable identity, owned by **Astra Matrix, Inc.**
Canonical domain: **`vybz.cloud`**.

**North star (locked):** music hub first — upload + waveform community, VDock streaming,
taste discovery, live studio + chat + Vc tips. Optional **Connection Lab** (18+ opt-in)
adds high-precision people matching including adult-consensual intents; default UI stays
music-calm and never dates-first.

**Launch wedge (GTM):** tip + live + catalog home for indie artists — not a full
Spotify clone yet. 90-day loop: upload → `/u/:id` → tip → live. Freeze VR/Immersive
and dating-first chrome. Public surface: marketing landing + alpha waitlist; signup
stays open via Enter VYBZ.

Home is the **hub feed** (live + trending) with Listen / Live / Connect / You / Wallet.
Artist pages (`/u/:id`) are storefronts. Tagline: **VYBZ: Find Yours.**

Authoritative sources (conflict order):

1. [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) — **Music Hub** doctrine
2. [`ARCHITECTURE.md`](./ARCHITECTURE.md)
3. [`SECURITY.md`](./SECURITY.md)
4. [`VERSIONING.md`](./VERSIONING.md)
5. [`IDEAS_BACKLOG.md`](./IDEAS_BACKLOG.md)
6. [`CHANGELOG.md`](./CHANGELOG.md)

Hard laws: no anonymity, no ads, no connection paywalls, no pay-to-win ranking, safety
never paid, 18+ for romantic/adult Connection Lab, Music Hub wins over legacy chrome.

## Cursor Cloud specific instructions

### Stack & tooling
- Vite 6 + React 18 + TypeScript 5.6 (strict) SPA/PWA; Tailwind 3; npm; Node 20+.
- Run from repo root. Origin only: `ALaustrup/VYBZ`.

### Commands
- `npm run dev` → http://localhost:5173
- `npm run lint` (`tsc --noEmit`)
- `npm run build`

### Runtime
- Requires `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (prod ref `xixmneooyufbeftdfpcm`).
- Secrets only in Edge Functions / server env.
- Music-only VDock; hub dashboard is the front door.
- Correctness gate: `npm run lint` + `npm run build` unless user asks for UI smoke.

### React chunking
Keep `react`, `react-dom`, `scheduler`, `react-router(-dom)` in the shared `vendor` chunk.
