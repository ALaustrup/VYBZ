# AGENTS.md

> **Read this first.** Conflict order below. When in doubt, prefer the Suite
> Masterplan and the **Pick up here** section over legacy chrome still present in `src/`.

---

## Pick up here — Track D: Delivery correction

### The one thing to understand before you touch anything

On 2026-07-31 a read-only audit of live production established that **eighteen merged,
tagged, deployed phases produced almost nothing an ordinary visitor could reach.**
Production was, and is, exactly current — the deployment is fine. The problem is that
the Suite has no front door.

- Production SHA `a84d984a` == repo HEAD. Verified twice. **Do not re-investigate the
  deployment.**
- `LandingPage.tsx` is the only surface a signed-out visitor sees, and it links to
  exactly four places: `/enter`, `/legal/terms`, `/legal/privacy`, `#waitlist`.
- Prepare, Credits, Distribution and MasterReady all work in production **anonymously**
  and are reachable only by typing the URL.
- Five `/__e2e__/*` test fixtures bypassed auth on the public internet — **fixed in D1**,
  ships on the next deploy.

Evidence: [`docs/architecture/PRODUCTION_REALITY_AUDIT_2026-07-31.md`](./docs/architecture/PRODUCTION_REALITY_AUDIT_2026-07-31.md).
Doctrine: [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) §0, §22, §23.

### Delivery vocabulary — use it or don't claim it

Never write "Complete." Use exactly one of:

`DOCUMENTED ONLY` · `STUB OR SCAFFOLD` · `INFRASTRUCTURE ONLY` · `NATIVE-PLATFORM ONLY` ·
`PARTIALLY IMPLEMENTED` · `IMPLEMENTED BUT NOT DELIVERED` · `DEPLOYED BUT UNVERIFIED` ·
`DELIVERED AND PRODUCTION-VERIFIED`

Merged ≠ delivered. Reachable ≠ discoverable. A green CI run proves only that the code
compiles and the tests pass.

### Product lock (do not reopen)

- **VYBZ** = release operating system for independent music. Tagline: **Find Yours.**
- **Promise:** Everything between finished and released.
- **Lifecycle:** Release Project → analyze → credits → masters → protect → package →
  distribute → artist page → VDock → live → sell/support.
- **Clients:** **VYBZ Cloud** (web) · **VYBZ Desktop** (Tauri 2) · **VYBZ Mobile**
  (Capacitor: Android built, iOS shell built) · one **VYBZ Platform Services** backend.
- **Governing principle:** One product core, one cloud platform, platform shells.
- **Audience layer (preserved):** `/u/:id`, VDock, Vc tips, LiveKit live, cosmetics.
- **Frozen:** VR/Immersive; dating-first / Spark-as-home; Living Home; Spotify-scale
  catalog race; Bunny as media origin; React Native rewrite without proven necessity.
- **Domain:** https://vybz.cloud · Owner: Astra Matrix, Inc. · GitHub: **`ALaustrup/VYBZ`** only.
- **Branch:** `main` (tip). Do **not** cut the `Beta-1A` tag until Track D and Track E pass.

### Repo / deploy truth (audit-verified 2026-08-01 UTC)

| Item | Value |
|------|--------|
| Integration branch | `main` (production) |
| App (Cloud) | https://vybz.cloud — Vercel `astramatrix/vybz` ← GitHub `main`, native Git integration (**no workflow deploys**) |
| Vercel IDs | team `team_gq3IWtz1kK0aO7kzMrrk6N6a` · project `prj_LY89Q0WAbKMfNmtYTyg1eQRrBfbI` |
| Production SHA at audit | `a84d984ad6a5d242b44f0d6acc3427b450de8446` — equals repo HEAD |
| Edge path | Cloudflare proxy → Vercel origin (`iad1`). Deployment protection **off** |
| Supabase | `xixmneooyufbeftdfpcm` (us-west-1) — **never** point at MYVYB / other projects |
| Email | Resend `vybz.cloud` · From `VYBZ <noreply@vybz.cloud>` |
| Stripe | VYBZ acct `acct_1TwTEtAnnpt9OYZI` |
| Site visuals CDN | `https://xixmneooyufbeftdfpcm.supabase.co/storage/v1/object/public/site-visuals/` |
| **Media origin** | **Supabase Storage only**. Bunny Edge functions dormant. Live = **LiveKit**. |
| Layout | Single-root `src/` + `packages/{domain,data,processing}` via path aliases. **No npm workspaces** (`package.json` has no `workspaces` key) |
| Desktop | `apps/desktop/src-tauri` — Tauri 2, Win/mac/Linux targets · [`DESKTOP_RELEASE.md`](./docs/operations/DESKTOP_RELEASE.md) |
| Android | root `android/` — Capacitor 8 · `appId: cloud.vybz.app` · [`ANDROID_RELEASE.md`](./docs/operations/ANDROID_RELEASE.md) |
| iOS | `ios/App` — Capacitor shell · [`IOS_RELEASE.md`](./docs/operations/IOS_RELEASE.md) |
| Package manager | **npm** (do not casually switch) |
| Platform Bridge | `src/platform/bridge/` — web · desktop · android · ios · mock |

### Phase ledger

The full ledger with delivery states is [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) §21.
Summary of what a user can actually reach:

| Delivery state | Phases |
|----------------|--------|
| `DELIVERED AND PRODUCTION-VERIFIED` (but undiscoverable) | 2 Prepare · 3 Credits · 8 Distribution |
| `PARTIALLY IMPLEMENTED` | 4 Processing · 10 Storefront · 15 Remote AI · 16 Collab |
| `IMPLEMENTED BUT NOT DELIVERED` | 7 Sync · 14 Cost Sentinel · 18 Cost-Minute Billing |
| `DEPLOYED BUT UNVERIFIED` | 9 Polish · 11 Perf/Premium UI · UI sweep #22–#29 |
| `NATIVE-PLATFORM ONLY` | 5 · 6 · 12 · 13 · 17 · 19 — zero installers distributed |
| `INFRASTRUCTURE ONLY` | 1 · 1.1 · 1.5 |

Tag prefix `v1.1.0-beta1A-`. Phase 19 tag → `617735e6`.

### Exact next actions — Track D only

No new phases, no tags, no polish PRs until Track D's exit gate passes.

1. ~~**D1 — remove `/__e2e__/*` from production builds**~~ **Done 2026-08-01.**
   Fixtures moved to `src/app/e2eFixtures.tsx` behind `VITE_E2E_FIXTURES`; enabled only
   by `npm run build:e2e`; `npm run check:no-fixtures` fails CI if a marker reappears
   in `dist/`. Verified: production bundle clean, all 26 e2e specs still pass.
2. **D2 — link the landing page to `/releases`.** The free readiness scan works today,
   needs no account, and is the site's own advertised secondary CTA.
3. **D3 — real sign-in prompt for protected routes**, preserving the intended
   destination. Today `/settings/costs` silently renders the marketing page at HTTP 200.
4. **D4 — resolve the 7 placeholder nav entries** (`/credits`, `/master`, `/coverlab`,
   `/sentinel`, `/relay`, `/wallet`, `/settings`): repoint or remove from `suiteNavRoutes()`.
5. **D5 — fix stale `phaseNote` strings** in `src/app/suitePlaceholderRoutes.tsx`.
   They cite execution-phase numbers that mean different work (see Masterplan §2.4).
   Product tracks use **names**, never numbers.
6. **D6 — first authenticated production verification pass**, with screenshots. The
   entire signed-in experience has never been observed.
7. **D7 — discoverable entry for Cost Sentinel and AI credits** from `/settings`.
8. **D8 — delete unused `suite-accent-wash-cyan`** from `src/index.css`.

**Track D exit gate:** a visitor with no account and no instructions can arrive at
`https://vybz.cloud`, reach the free readiness scan, complete it, and see Findings —
verified by screenshot. No `/__e2e__/` route resolves in production.

### Standing rules

- Do **not** expand Spark/dating, Living Home, VR, Bunny, or an RN rewrite. Park ideas
  in the Opportunity Register.
- Do **not** tag `Beta-1A` yet.
- Do **not** schedule workspace Stages C/E/F — no user value, real regression risk.
- Do **not** open further token/CSS refactor PRs. That sweep is measurably invisible.
- Domain code must **not** import `@tauri-apps/*` or `@capacitor/*` — use Platform
  Bridge only.
- **Deferred, owner-gated (do not block on these):** iOS TestFlight (OR-012, Apple
  Developer ~$99/yr) · AASA `TEAMID` · notarised DMG (`MAC_CERT_*`) · Android Play
  listing · migration-history workflow (OR-010).

### Correctness gate

`npm run lint` && `npm run test` && `npm run build`. E2E: `npm run test:e2e` (Playwright).

### Delivery gate (in addition to correctness)

Before marking anything complete, satisfy [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) §22:
route registered · entry point exists · auth level intentional · no test-only surface ·
deployed and fingerprinted · production-verified signed out · production-verified signed
in · delivery state declared · user-visible difference stated in one sentence.

### Do not commit

`vizualz/`, `public/**/loop.{mp4,webm}`, `public/backdrop/*.{mp4,webm}`, `.agents/`,
`skills-lock.json`, any `service_role` / `sbp_` tokens.

---

## Authoritative sources (conflict order)

1. [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) — Suite + multi-platform authority (**v2, 2026-07-31**)
2. This file (`AGENTS.md`) — agent ops + pickup state
3. [`ARCHITECTURE.md`](./ARCHITECTURE.md)
4. [`SECURITY.md`](./SECURITY.md)
5. [`VERSIONING.md`](./VERSIONING.md)
6. [`IDEAS_BACKLOG.md`](./IDEAS_BACKLOG.md) — Opportunity Register
7. [`CHANGELOG.md`](./CHANGELOG.md)
8. [`docs/DOCUMENTATION_MANIFEST.md`](./docs/DOCUMENTATION_MANIFEST.md) + ops docs

Evidence baseline: [`docs/architecture/PRODUCTION_REALITY_AUDIT_2026-07-31.md`](./docs/architecture/PRODUCTION_REALITY_AUDIT_2026-07-31.md).

Hard laws: no anonymity, no ads, no connection paywalls, no pay-to-win ranking,
safety never paid, 18+ for romantic/adult Connection Lab remnants, Suite Masterplan
wins over legacy chrome. One product core · shared shells · no client secrets that
bypass RLS. **Production is the source of truth about the product; the repo is the
source of truth about the code. When they disagree about what a user experiences,
production wins and the docs get fixed.**

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
| Platform layer | `src/platform/{bridge,jobs,costs,audit,orgs,sync,collab,cache,deeplinks,push}`, `providerHealth.ts` |

### Key surface map

| Concern | Path |
|---------|------|
| **Routing + auth gate** | `src/App.tsx` — the gate is ~lines 115–163. **Read it before changing any route.** |
| Suite routes / placeholders | `src/app/routeManifest.ts`, `src/app/suitePlaceholderRoutes.tsx` |
| Shell | `src/shell/SuiteShell.tsx`, `PrimaryRail.tsx`, `MobileNav.tsx`, `CommandBar.tsx`, `ContextInspector.tsx` |
| Marketing landing | `src/pages/LandingPage.tsx` — **the only anonymous surface** |
| Signed-in hub | `src/pages/ProfilePage.tsx` (`/`) |
| Artist storefront | `/u/:id` |
| Prepare | `src/features/prepare/` · `@vybz/domain/releases` · `@vybz/data/releases` |
| Credits | `src/features/credits/` · `/release/:id/credits` |
| Distribution | `src/features/distribution/` · `/release/:id/distribution` |
| Processing / Mastering | `@vybz/processing/*` · `src/features/{processing,mastering}` · `/release/:id/master` |
| Collab Sessions | `src/features/collab/` · `src/platform/collab/` · `/__e2e__/collab` (e2e builds only) |
| Costs / billing | `src/features/costs/` · `src/platform/costs/` · `/settings/costs`, `/settings/credits` |
| Market packs | `src/features/storefront/` · `/tools/packs`, `/pack/:slug` |
| Site visuals CDN | `src/lib/siteVisuals.ts` |
| Workspace plan | [`docs/architecture/REPO_WORKSPACE_PLAN.md`](./docs/architecture/REPO_WORKSPACE_PLAN.md) |

### Edge functions

Preserve the existing set including `visual-generate`, `storefront-*`, `stripe-*`,
`ai-topup`, `ai-mastering`, `processing-enqueue`, `livekit-token`, `watermark*`,
waitlist, audio-play. Deploy JWT rules unchanged unless a phase doc says otherwise.
`ai-topup` → `--no-verify-jwt` (verifies JWT in-function); redeploy `stripe-webhook`
for `kind=ai_topup`.

### Storage buckets

`site-visuals`, `media-public`, `audio-assets`, `project-files`, `storefront-previews`,
`storefront-zips` (+ Music Repos blobs). **No per-client silos.**

### Newest migrations (reference)

- `20260730_0088_collab_sessions.sql` — collaborators, comment threads, merge RPC
- `20260730_0087_processing_ai.sql` — AI jobs / results
- `20260728_0080_storefront_packs.sql`

### Gotchas

- Large media gitignored — serve from Storage.
- Bunny retired — do not set `VITE_FEATURE_BUNNY_AUDIO=on`.
- `data-theme="smoke"` is the **intended** Suite v2 dark root, not a legacy fallback.
- VDock overlays via `OverlayPortal` on `document.body`.
- Desktop packaging ≠ secure secrets.
- Do not declare native apps "done" because a webview opens.
- Destructive monorepo move forbidden; follow the staged workspace plan.
- GitHub Actions jobs failing instantly with "no runner assigned" usually means a
  **billing limit**, not a broken workflow.
- `suite-accent-wash-cyan` is defined but unused, so Tailwind prunes it from the bundle.
  Verifying a class in production requires it to actually be applied somewhere.

---

## Stack & commands

- **Stack:** Vite 6 + React 18 + TypeScript 5.6 (strict) SPA/PWA; Tailwind 3; npm; Node 20+.
- **Root only today** — the workspace is a **target**, not the current layout.
- `npm run dev` → http://localhost:5173
- `npm run lint` → `tsc --noEmit`
- `npm run test` / `npm run test:e2e` / `npm run build`

### Env (client)

- Required: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (**both present in production**)
- Missing Supabase → hard-stop (not a mock offline app)
- Never put service_role / Stripe secret / Resend / fal / Groq in `VITE_*`

---

## Cursor Cloud notes

Prefer `npm run lint` / `npm run test` / `npm run build` / `npm run test:e2e`.
Do not re-run `npm install` unless needed. Do not push unless the owner asks.
