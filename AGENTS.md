# AGENTS.md

> **Read this first.** Conflict order below. When in doubt, prefer the GTM wedge
> and the **Pick up here** section over legacy chrome still present in `src/`.

---

## Pick up here — 2026-07-28

### Product lock (do not reopen)
- **VYBZ** = tip + live + catalog home for indie artists. Tagline: **Find Yours.**
- **90-day loop:** upload → `/u/:id` + VDock play → tip (`~username` / Vc) → live.
- **Revenue:** cosmetics / Profile Enhancement **primary**; tips **secondary**.
- **Frozen:** VR/Immersive; dating-first front door / Spark-as-home; Spotify-scale catalog race.
- Access: marketing landing + alpha waitlist **and** open signup via **Enter VYBZ** (`/enter`).
- Domain: **https://vybz.cloud** · Owner: Astra Matrix, Inc. · GitHub: **`ALaustrup/VYBZ`** only.

### Repo / deploy truth
| Item | Value |
|------|--------|
| Branch | `main` (keep tip current with `origin/main`) |
| App | https://vybz.cloud |
| Supabase | `xixmneooyufbeftdfpcm` (us-west-1) — **never** point at MYVYB / other projects |
| Vercel | `astramatrix/vybz` ← GitHub `main` |
| Email | Resend domain `vybz.cloud` verified · From `VYBZ <noreply@vybz.cloud>` |
| Stripe | VYBZ acct `acct_1TwTEtAnnpt9OYZI` |
| Site visuals CDN | `https://xixmneooyufbeftdfpcm.supabase.co/storage/v1/object/public/site-visuals/` |

### Done recently (treat as shipped doctrine)
1. Launch reposition: landing, waitlist EF, legal `@vybz.cloud`, music-first onboarding (`e7fa109`).
2. SEO/logo pack + email defaults cutover to `vybz.cloud` (`8e5060c`).
3. All remote branches fast-forwarded to `main` tip.
4. **Object storage (not Git LFS):** public bucket `site-visuals`; encoded backdrop + VDock loops on CDN; app resolver `src/lib/siteVisuals.ts`; agent handoff rewritten in this file.

### Do not commit
`vizualz/`, `public/**/loop.{mp4,webm}`, `public/backdrop/*.{mp4,webm}`, `.agents/`, `skills-lock.json`, any `service_role` / `sbp_` tokens.

### Exact next actions (in order)
1. **Prod smoke (required before alpha blast):** on https://vybz.cloud  
   Enter → upload track → play on VDock → tip with Vc → go live briefly.  
   Confirm backdrop/loops load from the `site-visuals` CDN above.
2. **Small alpha cohort** (~5–15 artists) — same loop; collect friction notes.
3. **Money path:** cosmetics purchase + Vc top-up (Stripe) still works on prod.
4. **Only then:** `waitlist-notify` blast (secret `WAITLIST_NOTIFY_SECRET` or `DIGEST_CRON_SECRET`).
5. Optional: Resend tracking CNAME `mail` → `links1.resend-dns.com`; Google Search Console sitemap submit.
6. Do **not** expand Spark/dating, Living Home, or VR. Park ideas in `IDEAS_BACKLOG.md`.

### Correctness gate
`npm run lint` && `npm run build` (no automated test suite). Skip inherited MYVYB UI smoke unless the owner asks.

---

## Authoritative sources (conflict order)

1. [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) — Music Hub + **GTM wedge** (wins on product)
2. This file (`AGENTS.md`) — agent ops + pickup state
3. [`ARCHITECTURE.md`](./ARCHITECTURE.md)
4. [`SECURITY.md`](./SECURITY.md)
5. [`VERSIONING.md`](./VERSIONING.md)
6. [`IDEAS_BACKLOG.md`](./IDEAS_BACKLOG.md)
7. [`CHANGELOG.md`](./CHANGELOG.md)
8. [`docs/PRODUCTION_HARDENING.md`](./docs/PRODUCTION_HARDENING.md)

Hard laws: no anonymity, no ads, no connection paywalls, no pay-to-win ranking,
safety never paid, 18+ for romantic/adult Connection Lab, Music Hub wins over legacy chrome.

---

## Stack & commands

- **Stack:** Vite 6 + React 18 + TypeScript 5.6 (strict) SPA/PWA; Tailwind 3; npm; Node 20+.
- **Root only** — there is no `apps/` directory (README mention is stale).
- `npm run dev` → http://localhost:5173 (`server.host: true`)
- `npm run lint` → `tsc --noEmit`
- `npm run build` → `tsc --noEmit && vite build` → `dist/`
- `npm run visuals:encode` → encode masters from `vizualz/` → `public/`
- `npm run visuals:upload` → needs `SUPABASE_SERVICE_ROLE_KEY` → bucket `site-visuals`

### Env (client)
- Required multi-user: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (see `.env.example`).
- Missing Supabase env → app hard-stops (“backend not configured”) — **not** a mock offline app.
- Site visuals: omit `VITE_SITE_VISUALS_BASE` for CDN; set `local` for `/public` encode loop.
- Never put service_role / Stripe secret / Resend key in `VITE_*`.

---

## Key surface map

| Concern | Path |
|---------|------|
| Routing / auth shells | `src/App.tsx` |
| Marketing landing | `src/pages/LandingPage.tsx`, `src/components/landing/*` |
| Waitlist client | `src/lib/waitlist.ts` → EF `waitlist-join` |
| Waitlist blast | EF `waitlist-notify` |
| Signed-in hub home | `src/pages/ProfilePage.tsx` (`/`) |
| Artist storefront | `/u/:id` |
| Site visuals CDN | `src/lib/siteVisuals.ts`, `siteBackdrop.ts`, `vdockVisualManifest.ts` |
| SEO | `index.html`, `public/robots.txt`, `public/sitemap.xml`, `public/og.png`, `public/favicon.*` |
| Legal / Codex | `public/legal/*`, `src/lib/codex.ts` |
| Vc whitepaper | `/legal/vc` |
| Brand kit | `public/brand/*` |

### Edge functions (`supabase/functions/`)
`waitlist-join`, `waitlist-notify`, `weekly-digest`, `audio-play`, `bunny-live`, `bunny-sign`, `bunny-upload`, `stripe-*`, `livekit-token`, `passkey`, `oauth-*`, `embed`, `ice-servers`, `watermark*`, `vc-room-renewals`.

Deploy waitlist with **`--no-verify-jwt`** (public join; notify uses shared secret header).

### Storage buckets
| Bucket | Role |
|--------|------|
| **`site-visuals`** | Public CDN — backdrop + VDock loops; anon **read**; write = service_role only |
| `media-public` | Avatars / user public media (folder = uid) |
| `audio-assets` | Private audio masters |
| `project-files` | Private project files |

CDN pattern:  
`https://xixmneooyufbeftdfpcm.supabase.co/storage/v1/object/public/site-visuals/{backdrop\|vdock/visuals}/…`

### Newest migrations
- `20260728_0078_site_visuals_public_bucket.sql`
- `20260728_0077_alpha_waitlist.sql`
- `20260728_0076_audio_assets_supabase_backend.sql`

---

## Gotchas (pinpoint)

- **Large media:** gitignored. Serve from `site-visuals`. Re-upload after re-encode: `npm run visuals:upload`.
- **Git LFS:** rejected on purpose — free tier + clone bandwidth; use Storage.
- **Email:** all product mail from `@vybz.cloud` — not `astramatrix.xyz`.
- **Living Home / dating chrome:** may still exist as stubs or demoted routes — do not revive as the front door.
- **React vendor chunk:** keep `react`, `react-dom`, `scheduler`, `react-router(-dom)` in shared `vendor` chunk.
- **Secrets in chat:** if the owner pastes `service_role` / `sbp_`, use once for the task; never commit; do not nag about rotation unless they ask.
- **Origin-only Git:** `ALaustrup/VYBZ` — no legacy remotes.
- **VDock is not a modal viewport:** tips, comments, source pickers, expanded player MUST render via `OverlayPortal` (`src/lib/overlayPortal.tsx`) on `document.body`, above dock z-70, with bottom clearance for `--dock-reserve`. Never nest tall sheets inside `.vdock-shell`.
- **UX language:** frosted glass chips (`.glass-chip`), soft luminous blue atmosphere, stage-as-hero — see reference direction in chat / `NowPlayingStage`.

---

## Cursor Cloud notes

Same stack/commands as above. Dependency install is usually handled by Cloud startup; prefer not re-running `npm install` unless needed. Prefer `npm run lint` / `npm run build` over manual UI testing of inherited features unless the owner explicitly requests smoke of the **90-day loop**.
