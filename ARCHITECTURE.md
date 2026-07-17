# VYBZ — Architecture

The authoritative technical map of the VYBZ codebase. Product context lives in
[`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md).

## Overview

VYBZ is an **identity-first**, Supabase-backed React PWA with Bunny.net media.
Every account is a real creator; there is no anonymous/guest path. The client
talks to Supabase with the anon key under Row-Level Security; privileged paths
use `SECURITY DEFINER` RPCs and Edge Functions.

**Canonical domain:** `vybz.cloud` (also allowed: `vybz.astramatrix.xyz` for
legacy passkey/host allow-lists during cutover).

## Frontend

- **Entry:** `src/main.tsx` → `SessionProvider` → `App`.
- **Shell & routing (`src/App.tsx`):** desktop left rail + mobile bottom nav.
  Primary: `/` (feed), `/discover`, `/connect` (+ `/spark`, `/opportunities`),
  `/projects` (**Studio**), `/messages` (+ `/rooms`), `/profile`.
  Also: `/activity`, `/store`, `/admin`, `/mod`, `/apply-mod`, `/codex`,
  `/legal/:slug`, `/u/:id`, `/p/:id` (**Space** deep link), `*` → `NotFoundPage`.
- **Auth gate:** Onboarding (passkey-first) → username → `RoleIntentOnboarding`
  (role + intents + optional avatar) → app + `WelcomeTutorial`.
- **State:** `src/store/session.tsx`; player via `AudioBus` / `usePlayer()`.
- **Data:** `src/lib/api.ts` typed to `src/types.ts`.
- **Design:** Smoked-Glass tokens in `src/index.css`. **Per-surface theming**
  (`src/lib/surfaceTheme.ts`) sets `--accent-rgb` + the living-background variant
  per route, so every surface recolours (Feed=violet, Connect=pink, Studio=teal,
  Store=gold, …). Shared `PageHeader` primitive; `GrainOverlay` texture; `.reveal`
  staggered entrances; audio-reactive intensity preference in `src/lib/display.ts`
  (`getFxScale`) drives `ReactiveFrame` + `DynamicBackground`.

### Naming (product vs schema)

| UI | Schema / routes | Purpose |
|----|-----------------|---------|
| **Spaces** | `profile_projects`, `/p/:id` | Public microblogs / channels on a profile |
| **Studio** | `projects`, `/projects` | Private collab rooms, versions, splits, credits |

## Backend (Supabase)

### Schema highlights (`supabase/migrations/20260709_*.sql`)
- Profiles + taxonomy + `creator_roles` / `creator_seeks`
- `profile_modules` (match graph source) + `apply_role_intent_onboarding`
- `connections` + `respond_connection` + `match_feedback`
- Drops, assets, Studio projects, Spaces + `feed_posts`
- Rooms, notifications, staff/mod, cosmetics, passkeys, provenance ledger

### Edge Functions
`passkey`, `bunny-upload`, `bunny-sign`, `watermark`, `watermark-detect`, `embed`
(+ retained `push-send`, `stripe-webhook` for Lane A).

### Auth & media
- **Auth:** passkey-first WebAuthn + password fallback. Anonymous disabled.
- **Media:** Bunny public (post media) + Bunny secure (drops + Studio versions).
  Legacy Supabase buckets (`media-public` avatars, `audio-assets`) still supported.
- **C2PA:** `worker/c2pa` ready; gated on worker host secrets.

## Matchmaking

`collab_matches` v6 blends complementary roles, module disciplines, affinity,
embeddings (includes `roleLabel` + `intents`), Space follows, and reputation,
and returns an explainable 0–1 `confidence` read. Onboarding calls
`apply_role_intent_onboarding` so new creators get a module + implicit seeks from
`role_affinities` immediately.

**Learning-to-rank (0029).** `match_feedback` snapshots a normalized signal vector
(`match_signal_vector`) on every `connect`/`pass`/`accept`/`decline`.
`tune_matchmaking_weights()` scales each signal's weight from those outcomes
(support-shrunk, clamped to [0.4×, 2.0×] of the hand-tuned base) and writes them to
`matchmaking_learning`. Weight lookup `mm_w()` resolves **admin override → learned →
default**. Runs via nightly `pg_cron` (when available) or `/admin → Matchmaking → Run
learning` (`run_match_learning` / `match_learning_report`).

## Conventions

Identity-first; RLS everywhere; definer RPCs; idempotent migrations; strict
TypeScript (`npm run build` green); additive changes. Full rules in
`VYBZ_MASTERPLAN.md` §9.
