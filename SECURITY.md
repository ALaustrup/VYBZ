# VYBZ — Security & Privacy

_Astra Matrix, Inc._ · **Beta-0B**

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
  jsonb) is readable **only by its owner**; everyone else sees the sanitized
  `public_profile()` projection with hidden facets stripped.
- **Sensitive/privileged paths go through `SECURITY DEFINER` RPCs** that re-check
  `auth.uid()` and emit only aggregates + labels — never raw private facets.

## Access-control summary

| Data | Read | Write |
|---|---|---|
| `profiles` (full row) | owner only | owner only |
| public profile fields | `public_profiles` / `public_profile()` | — |
| `creator_roles` / `creator_seeks` | via definer RPCs | via `set_creator_roles` / module sync |
| `drops` / Project posts | feed-scoped | author only |
| `assets` (secure Bunny paths) | signed / watermarked download | owner upload via Edge Fn |
| Studio projects / versions | member-gated definer RPCs | members / owners |
| `connections` / DMs | participants only | participants only |
| tips / credit ledger | participant or owner RPCs | Stripe webhooks + Edge Fns |
| staff / reports | admin/mod RPCs | staff only |

## Auth

- **Passkey-first** WebAuthn (Edge Function `passkey`) with password fallback.
  Anonymous sign-in is **disabled** and must stay disabled.
- RP name `VYBZ`; host allow-list includes `vybz.cloud` and legacy
  `vybz.astramatrix.xyz`. Canonical production host: **`vybz.cloud`**.
- Email verification / custom SMTP via Resend when keys are provisioned.

## Storage & media protection

- **Avatars / public post media:** Supabase `media-public` (avatars) and Bunny
  public CDN (Project / feed post media).
- **Protected originals (drops + Studio versions):** Bunny secure zone +
  token-auth pull zone; signed via `bunny-sign`; downloads via `watermark`
  (WAV forensic watermark when applicable) + provenance ledger events.
- **C2PA Content Credentials:** optional forward from `watermark` when the
  `worker/c2pa` host is configured (self-signed cert OK for staging; CA-issued
  for production validators).
- **Payments:** Stripe secrets and webhook verification stay server-side
  (`stripe-webhook`, Connect + credit top-up functions). Client never holds
  service-role or Stripe secret keys.

## Reporting

Report security concerns to Astra Matrix, Inc. Please do not open public issues for
vulnerabilities that could put creators or media at risk.
