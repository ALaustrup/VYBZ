# VYBZ — Architecture

The authoritative technical map of the VYBZ codebase. Product context lives in
[`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md). Release labels:
[`VERSIONING.md`](./VERSIONING.md) (**current: Beta-0A.1**).

## Overview

VYBZ is an **identity-first**, Supabase-backed React PWA with Bunny.net media.
Every account is a real creator; there is no anonymous/guest path. The client
talks to Supabase with the anon key under Row-Level Security; privileged paths
use `SECURITY DEFINER` RPCs and Edge Functions.

**Canonical domain:** `vybz.cloud` (legacy alias `vybz.astramatrix.xyz` remains on
passkey/host allow-lists during cutover).

**Git:** single remote `origin` → [`ALaustrup/VYBZ`](https://github.com/ALaustrup/VYBZ).
Production deploys from `main` via Vercel project `astramatrix/vybz`.

## Frontend

- **Entry:** `src/main.tsx` → `SessionProvider` → `App`.
- **Shell (`AppChrome`):** sticky contextual app bar + scroll stage + fixed
  **full-bleed bottom dock** (taskbar + integrated `GlobalPlayer`). Same layout on
  mobile and desktop — **no side rail**. Taskbar pins use a `1fr | Orb | 1fr` grid
  with even pin spacing; customize via long-press / gear (`TaskbarPins`).
- **Orb (`OrbSphere`):** idle neochrome plasma sphere; while a track plays, eases
  into the uploader’s `playback_customization` morph + palette; on playback end,
  soft-blends back to idle. Listener intensity: **Off / Soft / VYBZ Max**
  (`src/lib/display.ts`). Viewport outline FX are retired (`ReactiveFrame` is a
  no-op stub kept for import stability).
- **Routing (`src/App.tsx`):**
  - Primary: `/` (feed), `/discover`, `/connect` (+ `/spark`, `/opportunities`),
    `/projects` (**Studio**), `/messages` (+ `/rooms`), `/live` (+ `/live/:id`),
    `/profile`.
  - Also: `/activity`, `/store`, `/admin`, `/mod`, `/apply-mod`, `/codex`,
    `/codex/:slug`, `/legal/:slug`, `/u/:id`, `/artist/:slug`, `/p/:id`
    (**Project** deep link), `*` → `NotFoundPage`.
- **Auth gate:** Onboarding (passkey-first) → username → `RoleIntentOnboarding`
  (role + intents + who-you-seek + optional avatar / role class) → app +
  `WelcomeTutorial`.
- **State:** `src/store/session.tsx`; player via `AudioBus` / `usePlayer()`.
- **Data:** `src/lib/api.ts` typed to `src/types.ts`.
- **Design:** Smoked-Glass tokens in `src/index.css`. **Per-surface theming**
  (`src/lib/surfaceTheme.ts`) sets `--accent-rgb` + living-background variant per
  route. Shared `PageHeader`; `GrainOverlay`; `.reveal` entrances;
  `DynamicBackground` scales with FX intensity; primary reactivity is the Orb.

### Naming (product vs schema)

| UI label | Schema / routes | Purpose |
|----------|-----------------|---------|
| **Projects** | `profile_projects`, `/p/:id` | On-profile creative projects: micro-blog posts and/or hub widgets (`project_page_widgets`) |
| **Studio** | `projects`, `/projects` | Private collab rooms: versions, splits, credits, bulk release batches |

(Historical docs sometimes said “Spaces” / “Collabs” for the same surfaces.)

## Backend (Supabase)

**Project ref:** `xixmneooyufbeftdfpcm` (us-west-1). This is the **VYBZ** production
project (CLI link name may still show as `vyb-audio`). Do not point the app at any
other Supabase project.

### Schema highlights (`supabase/migrations/`)
Migrations are timestamped from `20260709_*` through `20260724_*` (58+ files).
Core: profiles + taxonomy + `creator_roles` / `creator_seeks`; `profile_modules` +
`apply_role_intent_onboarding`; connections + DMs; drops / assets / playback
customization; Studio projects + release batches; profile Projects + widgets;
rooms; live streams; staff/mod; cosmetics + credit top-ups; passkeys; provenance
ledger; weekly digest; OAuth connections; habit/trust; network hard filters.

### Discovery & feed
`search_creators` powers faceted Discover. Feed ranking:
`feed_for_you` / `feed_undiscovered`. Realtime: `drops` + `project_posts` on
`supabase_realtime`.

### Edge Functions (`supabase/functions/`)

| Function | Role |
|----------|------|
| `passkey` | WebAuthn |
| `bunny-upload` / `bunny-sign` / `bunny-live` | Media upload, signed URLs, live media helpers |
| `watermark` / `watermark-detect` | Forensic watermark + optional C2PA forward |
| `embed` | gte-small resonance embeddings |
| `stripe-connect-onboard` / `stripe-tip` / `stripe-webhook` / `stripe-credit-topup` | Connect tips + cosmetic credit packs |
| `oauth-start` / `oauth-callback` | Third-party OAuth links |
| `ice-servers` | WebRTC ICE / TURN config |
| `weekly-digest` | Opt-in Resend weekly digest |

Shared helpers live under `_shared/`. There is **no** `push-send` function in-tree.

### Auth & media
- **Auth:** passkey-first WebAuthn + password fallback. Anonymous disabled.
- **Media:** Bunny public (post media) + Bunny secure (drops + Studio versions).
  Legacy Supabase buckets (`media-public` avatars, `audio-assets`) still readable.
  Uploads stream through `bunny-upload` (≤1 GB) with client progress.
- **Library:** `UploadsLibrary` on profile (rename / delete / feature drop).
- **C2PA:** `worker/c2pa` container; gated on `C2PA_WORKER_*` secrets.

## Professions & role class

Four professions (`src/lib/profileFields.ts`): Music, Visual Art, Film/Video,
Game Dev. **Role Class** (supporter, booker, curator, brand, educator, …) is a
second identity axis (`VITE_FEATURE_ROLE_CLASS`) with matchmaking guardrails so
adjacent accounts never outrank creator↔creator collabs. Commissions board +
Stripe Connect tips (`VITE_FEATURE_TIPS`) are shipped.

## Matchmaking

`collab_matches` (v7+) blends complementary roles, modules, affinity, embeddings,
Project follows, reputation, and role-class signals with an explainable confidence.
Learning-to-rank via `match_feedback` → `tune_matchmaking_weights()` /
`matchmaking_learning` (cron or Admin → Matchmaking).

## Conventions

Identity-first; RLS everywhere; definer RPCs; idempotent migrations; strict
TypeScript (`npm run build` green); additive changes. Full rules in
`VYBZ_MASTERPLAN.md` §9. Release process in `VERSIONING.md`.
