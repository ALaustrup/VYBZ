# AGENTS.md

> **Read this first.** Conflict order below. When in doubt, prefer the Suite
> Masterplan and the **Pick up here** section over legacy chrome still present in `src/`.

---

## Pick up here — Suite Genesis (Beta-1A)

### Product lock (do not reopen)
- **VYBZ** = release operating system for independent music. Tagline: **Find Yours.**
- **Promise:** Everything between finished and released.
- **Lifecycle:** project → analyze → credits → masters → protect → package → distribute → artist page → VDock → live → sell/support.
- **Audience layer (preserved):** `/u/:id`, VDock, Vc tips, LiveKit live, cosmetics.
- **Frozen:** VR/Immersive; dating-first / Spark-as-home; Living Home; Spotify-scale catalog race; Bunny as media origin.
- **Domain:** https://vybz.cloud · Owner: Astra Matrix, Inc. · GitHub: **`ALaustrup/VYBZ`** only.
- **Branch:** `suite-genesis` (Phase 0 doctrine). Do not cut `Beta-1A` tag until shell + cost kernel + Prepare scan pass production gates.

### Repo / deploy truth
| Item | Value |
|------|--------|
| Integration branch | `main` (production); Suite work on `suite-genesis` until merge |
| App | https://vybz.cloud (Vercel `astramatrix/vybz` ← GitHub `main`) |
| Supabase | `xixmneooyufbeftdfpcm` (us-west-1) — **never** point at MYVYB / other projects |
| Email | Resend `vybz.cloud` · From `VYBZ <noreply@vybz.cloud>` |
| Stripe | VYBZ acct `acct_1TwTEtAnnpt9OYZI` |
| Site visuals CDN | `https://xixmneooyufbeftdfpcm.supabase.co/storage/v1/object/public/site-visuals/` |
| **Media origin** | **Supabase Storage only**. Bunny Edge functions dormant. Live = **LiveKit**. |
| Planned host | Cloudflare Pages canary later; Vercel remains production until verified cutover |

### Phase status
| Phase | Status |
|-------|--------|
| **0 Suite Genesis doctrine** | **Complete** on branch `suite-genesis` (docs + inventories; no `Beta-1A` tag) |
| **1 Engineering + design foundation** | **Next** — Vitest/Playwright/CI, design tokens, SuiteShell, route manifest code, job/cost/audit models |
| 2–9 | See [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) |

### Exact next actions
1. **Phase 1 now:** quality foundation (Vitest, Playwright, CI) + Suite shell with product placeholders + job/cost/audit models.
2. Owner secrets still needed for shipped alpha surfaces: `FAL_KEY` → `visual-generate`; `GROQ_API_KEY` + migration `0080` → storefront; redeploy `stripe-webhook`.
3. Prod smoke on vybz.cloud: Enter → upload → VDock → tip → brief live; CDN site-visuals.
4. Do **not** expand Spark/dating, Living Home, VR, or Bunny. Park ideas in Opportunity Register.
5. Do **not** tag `Beta-1A` until shell + cost kernel + Prepare scan pass production gates.

### Correctness gate
`npm run lint` && `npm run build`. Automated tests arrive in Phase 1.

### Do not commit
`vizualz/`, `public/**/loop.{mp4,webm}`, `public/backdrop/*.{mp4,webm}`, `.agents/`,
`skills-lock.json`, any `service_role` / `sbp_` tokens.

---

## Authoritative sources (conflict order)

1. [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) — Suite product authority
2. This file (`AGENTS.md`) — agent ops + pickup state
3. [`ARCHITECTURE.md`](./ARCHITECTURE.md)
4. [`SECURITY.md`](./SECURITY.md)
5. [`VERSIONING.md`](./VERSIONING.md)
6. [`IDEAS_BACKLOG.md`](./IDEAS_BACKLOG.md) — Opportunity Register
7. [`CHANGELOG.md`](./CHANGELOG.md)
8. [`docs/DOCUMENTATION_MANIFEST.md`](./docs/DOCUMENTATION_MANIFEST.md) + ops docs

Hard laws: no anonymity, no ads, no connection paywalls, no pay-to-win ranking,
safety never paid, 18+ for romantic/adult Connection Lab remnants, Suite Masterplan
wins over legacy chrome.

---

## Preserve (do not rewrite from scratch)

| Concern | Anchor |
|---------|--------|
| Music Repos CAS | `src/lib/repoSync.ts`, `src/lib/api.ts`, migrations `0059`/`0060`, `src/components/repos/` |
| Local companion | `tools/vybz-bridge/` (user-facing rename target: **VYBZ Engine**) |
| Feature flags | `src/lib/flags.ts` |
| Watermark | `supabase/functions/watermark`, `watermark-detect`, `_shared/watermark.mjs` |
| Storefront | `src/features/storefront/`, pages `/tools/packs`, `/pack/:slug`, EFs `storefront-*` |
| AI stills | EF `visual-generate`, Studio Generate tab, `studioBackdropHandoff.ts` |
| Playback | AudioBus, VDock, OverlayPortal rules |
| Auth / money / live | Passkeys, Stripe Connect/Checkout, LiveKit token EF |

---

## Cost rules (agents)

1. No unbounded provider call.
2. Paid jobs: estimate → user approval → reserve → execute → reconcile.
3. Optional providers default `disabled` or `free_only` (fal prepaid only).
4. Prefer browser → Bridge/Engine → Edge → free external → paid external.
5. Deterministic code before AI for validation/measurement.
6. No agent may purchase vendor subscriptions or raise hard budgets.

See [`docs/operations/COST_CONTROL.md`](./docs/operations/COST_CONTROL.md).

---

## Stack & commands

- **Stack:** Vite 6 + React 18 + TypeScript 5.6 (strict) SPA/PWA; Tailwind 3; npm; Node 20+.
- **Root only** — no `apps/` directory.
- `npm run dev` → http://localhost:5173
- `npm run lint` → `tsc --noEmit`
- `npm run build` → `tsc --noEmit && vite build`
- `npm run visuals:encode` / `visuals:upload` → site-visuals CDN

### Env (client)
Required multi-user: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`. Missing → hard stop.
Never put service_role / Stripe secret / Resend / fal / Groq keys in `VITE_*`.

---

## Key surface map (current + Suite target)

| Concern | Path / note |
|---------|-------------|
| Routing today | Flat routes in `src/App.tsx` (Suite shell lands Phase 1) |
| Target routes | [`docs/architecture/ROUTE_MANIFEST.md`](./docs/architecture/ROUTE_MANIFEST.md) |
| Marketing | `src/pages/LandingPage.tsx` |
| Artist | `/u/:id` |
| Studio / repos | `/projects`, `/projects/:id` → Suite Studio |
| Market | `/tools/packs`, `/pack/:slug` → Suite Market |
| Inventories | Route, DB, providers, cost under `docs/architecture/` |

### Edge functions
`waitlist-*`, `weekly-digest`, `audio-play`, dormant `bunny-*`, `stripe-*`, `livekit-token`,
`passkey`, `oauth-*`, `embed`, `ice-servers`, `watermark*`, `vc-room-renewals`,
`visual-generate`, `storefront-pack-copy`, `storefront-pack-art`, `storefront-checkout`.

### Storage buckets
`site-visuals` (public CDN) · `media-public` · `audio-assets` · `project-files` ·
`storefront-previews` · `storefront-zips` · Music Repos CAS paths per migrations.

### Newest migrations
- `20260728_0080_storefront_packs.sql`
- `20260728_0079_visual_generate_spend.sql`
- `20260728_0078_site_visuals_public_bucket.sql`

---

## Gotchas

- Large media gitignored — serve from Storage CDN.
- VDock overlays via `OverlayPortal` on `document.body`, never nested tall sheets in `.vdock-shell`.
- React vendor chunk: keep react / react-dom / scheduler / react-router in shared `vendor`.
- Origin-only Git: `ALaustrup/VYBZ`.
- Secrets pasted in chat: use once; never commit.

## Cursor Cloud notes

Prefer `npm run lint` / `npm run build`. Do not invent monorepos or Next.js rewrites.
