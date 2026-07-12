# VYBZ — Architecture

The authoritative technical map of the VYBZ v1 codebase. Product context lives in
[`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md).

## Overview

VYBZ is an **identity-first**, Supabase-backed React PWA. Every account is a real
creator; there is no anonymous/guest path. The client talks to Supabase with the anon
key under Row-Level Security; all privileged reads/writes go through `SECURITY DEFINER`
RPCs that re-check `auth.uid()` and emit only public/aggregate data.

## Frontend

- **Entry:** `src/main.tsx` → `SessionProvider` → `App`.
- **Shell & routing (`src/App.tsx`):** responsive layout — a left rail on desktop, a
  bottom nav on mobile. Routes: `/` (Drops feed), `/connect`, `/spark`,
  `/opportunities`, `/messages` + `/messages/:id`, `/profile`, `/profile/edit`,
  `/u/:id`. An auth gate renders onboarding → username setup → app.
- **State:** `src/store/session.tsx` (`useSession`) holds auth session, the current
  profile, and transient UI (toast/celebrate). Player state is the `AudioBus`
  singleton, consumed via `usePlayer()`.
- **Data access:** `src/lib/api.ts` — every Supabase call, typed to `src/types.ts`.
- **Audio:** `src/lib/audioBus.ts` (one shared `AudioContext` → `AnalyserNode` → gain),
  `src/lib/waveform.ts` (decode peaks + quality), and the components `GlobalPlayer`,
  `TrackCard`, `Waveform`, `TrackVisualizer`.
- **Design system:** `src/index.css` (Smoked-Glass tokens, `.glass`, `.btn-*`, glow),
  `tailwind.config.js`, and primitives (`Brand`, `Toast`, `Confetti`, `EmptyState`,
  `Handle`, `DynamicBackground`). The per-page accent resolves against `--accent-rgb`.
- **Music catalog:** `src/lib/profileFields.ts` is the single source of truth for roles,
  genres, DAWs, plugins, keys, and the matching-facet shape.

## Backend (Supabase)

### Schema (`supabase/migrations/20260709_*.sql`)
- **`profiles`** — identity row keyed to `auth.users`; owner-private `profile` jsonb of
  music facets (GIN-indexed) with a `_hidden` privacy array. A `public_profiles` view +
  `public_profile()` RPC expose only sanitized public fields. A trigger auto-creates a
  profile on signup.
- **Taxonomy:** `roles`, `genres`, `daws`, `plugins` (world-readable, admin-written).
- **Bipartite core:** `creator_roles` (offers) + `creator_seeks` (seeks).
- **`profile_embeddings`** — pgvector, written server-side for semantic resonance.
- **`drops` + `reactions`** — the sound-first feed and its Vyb/Fail taste signal
  (tallied onto drops by trigger).
- **`assets` + `track_ratings` + `asset_downloads`** — uploaded audio/project material
  (with P2P swarm manifest columns designed in for later), embedded ratings (aggregate
  cached by trigger), and the download/license record.
- **`connections` + `dm_threads`/`dm_messages`** — the collaboration graph + 1:1 DMs.
- **`collab_posts` + `collab_applications`** — the opportunity board.

### RPCs (definer)
`collab_matches`, `my_opportunities`, `set_creator_roles`, `my_creator_roles`,
`creator_roles_for`, `public_profile`, `rate_track`, `request_asset_download`,
`start_dm`, plus `jsonb_overlap_count`/`jsonb_overlap_names` helpers.

### Auth & storage
- Email + password (passkey planned). Anonymous sign-in **disabled**.
- Buckets: `media-public` (avatars, public), `audio-assets` + `project-files` (private;
  access via short-lived signed URLs). Owner-scoped storage RLS.
- Edge Functions kept: `embed` (resonance embeddings), `passkey` (WebAuthn, pending).

## Matchmaking

`collab_matches` blends complementary-role overlap (both directions + mutual bonus)
with genre/DAW/plugin/tempo/language overlap and pgvector semantic resonance, returning
the "why" and a 0–1 fit. See `VYBZ_MASTERPLAN.md` §5 for the model and the enhancement
roadmap.

## Conventions

Identity-first; RLS everywhere; definer RPCs for privileged paths; idempotent
timestamped migrations; strict TypeScript with `npm run build` green before commit;
additive, non-breaking changes. Full rules in `VYBZ_MASTERPLAN.md` §9.
