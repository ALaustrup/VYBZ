# AGENTS.md

> **Read this first.** Conflict order below. When in doubt, prefer the Suite
> Masterplan and the **Pick up here** section over legacy chrome still present in `src/`.

---

## Pick up here — Suite Genesis (Beta-1A) · Multi-platform

### Product lock (do not reopen)
- **VYBZ** = release operating system for independent music. Tagline: **Find Yours.**
- **Promise:** Everything between finished and released.
- **Lifecycle:** Release Project → analyze → credits → masters → protect → package → distribute → artist page → VDock → live → sell/support.
- **Clients:** **VYBZ Cloud** (web) · **VYBZ Desktop** (Tauri 2, Windows first) · **VYBZ Mobile / Android** (Capacitor) · one **VYBZ Platform Services** backend.
- **Governing principle:** One product core, one cloud platform, three shells. Same account / DB / Storage across clients.
- **Audience layer (preserved):** `/u/:id`, VDock, Vc tips, LiveKit live, cosmetics.
- **Frozen:** VR/Immersive; dating-first / Spark-as-home; Living Home; Spotify-scale catalog race; Bunny as media origin; React Native rewrite without proven necessity.
- **Domain:** https://vybz.cloud · Owner: Astra Matrix, Inc. · GitHub: **`ALaustrup/VYBZ`** only.
- **Branch:** `suite-genesis`. Do **not** cut `Beta-1A` tag until Cloud shell + cost kernel + Prepare scan pass production gates. Do **not** push/PR unless owner explicitly asks.

### Repo / deploy truth
| Item | Value |
|------|--------|
| Integration branch | `main` (production); Suite work on `suite-genesis` until merge |
| App (Cloud) | https://vybz.cloud (Vercel `astramatrix/vybz` ← GitHub `main`) |
| Supabase | `xixmneooyufbeftdfpcm` (us-west-1) — **never** point at MYVYB / other projects |
| Email | Resend `vybz.cloud` · From `VYBZ <noreply@vybz.cloud>` |
| Stripe | VYBZ acct `acct_1TwTEtAnnpt9OYZI` |
| Site visuals CDN | `https://xixmneooyufbeftdfpcm.supabase.co/storage/v1/object/public/site-visuals/` |
| **Media origin** | **Supabase Storage only**. Bunny Edge functions dormant. Live = **LiveKit**. |
| Android seed | Capacitor 8 · `capacitor.config.ts` · `appId: cloud.vybz.app` · `android/` present |
| Desktop | Tauri 2 PoC scaffold in `apps/desktop/` (Rust required to boot; see README) |
| Layout | Single-root SPA; Stage A aliases `@vybz/*` — no file moves yet |
| Package manager | **npm** (do not casually switch) |
| Platform Bridge | `src/platform/bridge/` — web + mock + desktop/android stubs |
| Prepare | `@vybz/domain/releases` · `@vybz/data/releases` · `src/features/prepare/` |

### Phase status
| Phase | Status |
|-------|--------|
| **0 Suite Genesis doctrine** | **Complete** |
| **1 Engineering + design foundation** | **Complete** |
| **1.1 Playwright hardening** | **Complete** |
| **1.5 Platform readiness** | **Complete** — see [`docs/architecture/PHASE15_EXIT_GATE.md`](./docs/architecture/PHASE15_EXIT_GATE.md) |
| **2 Prepare MVP** | **Complete** — see [`docs/architecture/PHASE2_EXIT_GATE.md`](./docs/architecture/PHASE2_EXIT_GATE.md) |
| **2.D / 2.A** | Desktop Windows alpha · Android alpha (may overlap later) |
| **3 Credits + metadata** | **Next** |
| 4–9 · P · R | See [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) |

### Exact next actions
1. **Phase 3 now:** Credits + metadata — multi-account approved credit state; reuse Release Project + Platform Bridge.
2. Owner secrets still needed for shipped alpha surfaces: `FAL_KEY` → `visual-generate`; `GROQ_API_KEY` + migration `0080` → storefront; redeploy `stripe-webhook`.
3. Prod smoke on vybz.cloud: Enter → upload → VDock → tip → brief live; CDN site-visuals.
4. Do **not** expand Spark/dating, Living Home, VR, Bunny, or RN rewrite. Park ideas in Opportunity Register.
5. Do **not** tag `Beta-1A` yet. Keep storefront/visual WIP isolated.
6. Optional: repair Supabase migration history so `db push` matches applied `0081` schema.
7. Domain code must **not** import `@tauri-apps/*` or `@capacitor/*` — use Platform Bridge only.

### Correctness gate
`npm run lint` && `npm run test` && `npm run build`. E2E: `npm run test:e2e` (Playwright).

### Do not commit
`vizualz/`, `public/**/loop.{mp4,webm}`, `public/backdrop/*.{mp4,webm}`, `.agents/`,
`skills-lock.json`, any `service_role` / `sbp_` tokens.

---

## Authoritative sources (conflict order)

1. [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) — Suite + multi-platform authority
2. This file (`AGENTS.md`) — agent ops + pickup state
3. [`ARCHITECTURE.md`](./ARCHITECTURE.md)
4. [`SECURITY.md`](./SECURITY.md)
5. [`VERSIONING.md`](./VERSIONING.md)
6. [`IDEAS_BACKLOG.md`](./IDEAS_BACKLOG.md) — Opportunity Register
7. [`CHANGELOG.md`](./CHANGELOG.md)
8. [`docs/DOCUMENTATION_MANIFEST.md`](./docs/DOCUMENTATION_MANIFEST.md) + ops docs

Hard laws: no anonymity, no ads, no connection paywalls, no pay-to-win ranking,
safety never paid, 18+ for romantic/adult Connection Lab remnants, Suite Masterplan
wins over legacy chrome. One product core · three shells · no client secrets that
bypass RLS.

---

## Preserve (do not rewrite from scratch)

| Concern | Anchor |
|---------|--------|
| Music Repos CAS | `src/lib/repoSync.ts`, `src/lib/api.ts`, migrations `0059`/`0060`, `src/components/repos/` |
| Local companion | `tools/vybz-bridge/` (user-facing rename target: **VYBZ Engine**) — distinct from Platform Bridge |
| Feature flags | `src/lib/flags.ts` |
| Watermark | `supabase/functions/watermark`, `watermark-detect`, `_shared/watermark.mjs` |
| Capacitor Android | `capacitor.config.ts`, `android/`, `@capacitor/*` |
| Suite shell / tokens | `src/shell/`, `src/design/`, `src/components/ui/`, `src/components/states/` |
| Platform stubs | `src/platform/{jobs,costs,audit,orgs}`, `providerHealth.ts` |

### Key surface map

| Concern | Path |
|---------|------|
| Routing / auth shells | `src/App.tsx`, `src/shell/SuiteShell.tsx`, `src/app/routeManifest.ts` |
| Platform Bridge (Phase 1.5) | `src/platform/bridge/**` (target) |
| Marketing landing | `src/pages/LandingPage.tsx` |
| Signed-in hub | `src/pages/ProfilePage.tsx` (`/`) |
| Artist storefront | `/u/:id` |
| Prepare (Phase 2) | placeholders → `src/features/prepare` |
| Market packs | `src/features/storefront/` |
| Site visuals CDN | `src/lib/siteVisuals.ts` |
| Workspace plan | [`docs/architecture/REPO_WORKSPACE_PLAN.md`](./docs/architecture/REPO_WORKSPACE_PLAN.md) |

### Edge functions
Preserve existing set including `visual-generate`, `storefront-*`, `stripe-*`,
`livekit-token`, `watermark*`, waitlist, audio-play, etc. Deploy JWT rules unchanged
unless a phase doc says otherwise.

### Storage buckets
`site-visuals`, `media-public`, `audio-assets`, `project-files`,
`storefront-previews`, `storefront-zips` (+ Music Repos blobs). **No per-client silos.**

### Newest migrations (reference)
- `20260728_0080_storefront_packs.sql`
- `20260728_0079_visual_generate_spend.sql`
- Suite Prepare tables: Phase 2 (not yet)

### Gotchas
- Large media gitignored — serve from Storage.
- Bunny retired — do not set `VITE_FEATURE_BUNNY_AUDIO=on`.
- VDock overlays via `OverlayPortal` on `document.body`.
- Desktop packaging ≠ secure secrets.
- Do not declare native apps “done” because a webview opens.
- Destructive monorepo move forbidden; follow staged workspace plan.

---

## Stack & commands

- **Stack:** Vite 6 + React 18 + TypeScript 5.6 (strict) SPA/PWA; Tailwind 3; npm; Node 20+.
- **Root only today** — workspace is a **target**, not current layout.
- `npm run dev` → http://localhost:5173
- `npm run lint` → `tsc --noEmit`
- `npm run test` / `npm run test:e2e` / `npm run build`
- Target multi-client scripts: see Master Blueprint §6 / Phase 1.5

### Env (client)
- Required: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- Missing Supabase → hard-stop (not a mock offline app)
- Never put service_role / Stripe secret / Resend / fal / Groq in `VITE_*`

---

## Cursor Cloud notes

Prefer `npm run lint` / `npm run test` / `npm run build` / `npm run test:e2e`.
Do not re-run `npm install` unless needed. Do not push unless owner asks.
