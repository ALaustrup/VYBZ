# VYBZ — Security & Privacy

_Astra Matrix, Inc._

How VYBZ handles accounts, sensitive data, and access control. VYBZ is
**identity-first** — every account is a real creator — but it collects as little as
possible and protects it with Postgres Row-Level Security and definer-gated RPCs.

## Principles

- **PII stays in Supabase Auth.** Email lives only in `auth.users` (not world-readable).
  `public.profiles` has **no email column**; the world-readable `public_profiles` view
  exposes only safe fields (username, display name, avatar, location).
- **The client uses the anon key only.** The service-role key is never in the client
  bundle or repo; privileged work runs in Edge Functions / definer RPCs.
- **RLS on every table.** The full `profiles` row (including the private `profile`
  jsonb of music facets, with its `_hidden` array) is readable **only by its owner**;
  everyone else sees the sanitized `public_profile()` projection with hidden facets
  stripped.
- **Sensitive/privileged paths go through `SECURITY DEFINER` RPCs** that re-check
  `auth.uid()` and emit only aggregates + labels — never raw private facets. This
  covers matchmaking (`collab_matches`, `my_opportunities`), ratings (`rate_track`),
  downloads (`request_asset_download`), and DMs (`start_dm`). Definer functions always
  `set search_path = public`.

## Access-control summary

| Data | Read | Write |
|---|---|---|
| `profiles` (full row) | owner only | owner only |
| public profile fields | `public_profiles` view / `public_profile()` RPC | — |
| `creator_roles` / `creator_seeks` | via definer RPCs | via `set_creator_roles` RPC |
| `drops` | all (feed) | author only |
| `reactions` / `track_ratings` | own (+ cached aggregates on the row) | own (ratings via `rate_track`) |
| `assets` | preview kinds public; project/preset owner-only | owner only |
| `connections` / DMs | participants only | participants only |
| taxonomy (`roles`/`genres`/`daws`/`plugins`) | all | admin only |

## Auth

- Email + password today; passkey (WebAuthn) sign-in is planned on top. **Anonymous
  sign-in is disabled** at the project level and must stay disabled.
- Email verification is off during alpha and will be enabled before public launch.

## Storage

- `media-public` (avatars) is public-read, owner-scoped writes.
- `audio-assets` and `project-files` are private; full-quality access flows through
  short-lived signed URLs, and (roadmap) a permission + license check via
  `request_asset_download`, with every grant recorded in `asset_downloads`.

## Roadmap (protection layer)

Per-recipient forensic watermarking on delivery, a perceptual-fingerprint provenance
registry, an auditable license chain, and DMCA/takedown tooling — see
`VYBZ_MASTERPLAN.md` §6.

## Reporting

Report security concerns to Astra Matrix, Inc. Please do not open public issues for
sensitive reports.
