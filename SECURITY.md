# MYVYB — Security & Privacy Review

_Astra Matrix, Inc. · last reviewed during Phase B (auth/account/security)._

This document records how MYVYB handles accounts, sensitive data, and access
control, plus the findings and follow-ups from the Phase B review.

## Summary

- **Email and other true PII never live in the application database.** Email
  exists only in Supabase Auth (`auth.users`), which is not world-readable.
  `public.profiles` has **no email column** (verified).
- The client uses the **anon key**; the **service-role key** is only ever used
  server-side inside Edge Functions. No secrets are in the client bundle or repo.
- Every table that holds user data enforces **Row-Level Security (RLS)**.
- Sensitive/privileged mutations go through **`SECURITY DEFINER` RPCs** that
  re-check `auth.uid()` (credits, games, roulette, leaderboards, identity).

## Data model & access control

| Table | Read policy | Write policy | Notes |
|---|---|---|---|
| `profiles` | world-readable (`true`) | own row only (`auth.uid() = id`) | No email/PII. See Finding 1. |
| `confessions` | world-readable | author only / definer RPCs | Author identity denormalized only when public. |
| `reactions`, `comments` | per policy | author only | Drive author notifications via triggers. |
| `messages` (DMs) | participants only | participants only | 1:1 direct messages. |
| `friendships` | participants only | participants only | Identified-only (trigger). See below. |
| `blocks` | own rows | own rows | |
| `notifications` | own rows | own rows + definer triggers | Per-user realtime. |
| `credit_ledger` | own rows | definer RPCs only | V¢ is server-authoritative. |
| `game_scores` | own rows | definer RPC (`award_game_credits`) | Leaderboards via definer RPC. |
| `roulette_queue` | none (RLS on, no policy) | definer RPCs only | Matchmaking is server-side. |
| `roulette_sessions` | participants only | definer RPCs only | Messages are **never stored** (broadcast-only). |
| `passkeys` | own rows | own rows / service | WebAuthn credentials. |
| `webauthn_challenges` | service only | service only | One-time challenges. |

### Accounts & tiers
- **Anonymous** is a separate, limited tier: no V¢ wallet, **cannot add friends**
  (DB trigger rejects friendships where either side is anonymous), and is gated
  from member-only actions (the in-app "become a member / upgrade" gate).
- **Identified** ("Unveil Yourself") accounts are resumed on their device via a
  durable local marker, so the sign-on screen isn't shown again until logout or
  a data reset — kept strictly separate from the anonymous tier.

### Passkeys (WebAuthn)
- Phishing-resistant, biometric sign-in. Credentials are stored per-user
  (`passkeys`, own-row RLS); challenges are one-time and service-only.
- The Edge Function binds the **RP ID to the request hostname** and accepts the
  production host, `localhost`, and the project's `*.vercel.app` hosts (fixed in
  Phase B — registration previously 403'd on non-canonical hosts).
- **By design, a passkey rides on an email-anchored account** so a session can be
  minted on future logins. Users link an email once, then add a passkey per
  device. (Supporting passkeys for email-less identity accounts would require a
  custom session-minting path — see Follow-ups.)

## Findings

### Finding 1 — `profiles` optional self-disclosures are cross-user readable (Medium) — ✅ RESOLVED
**Resolution:** Table-wide `SELECT` on `profiles` was revoked from `anon`/`authenticated`
and re-granted on only the non-sensitive columns, so `gender`/`age`/`location`
can no longer be read by direct client queries. The three legitimate read paths
now go through `SECURITY DEFINER` functions: `my_profile()` (owner reads own
private fields), `public_profile(id)` (returns those fields only when
`identity_public`), and `admin_list_users(query, limit)` (admin-gated). Writes
and the existing identity RPCs are unchanged.

_Original finding:_
The `profiles` SELECT policy is `true` (needed so the feed can read other users'
public handles — `emoji_key`, `alias` — and cosmetics). However, the optional
self-disclosure columns `gender`, `age`, `location` are then technically
readable by any authenticated client via a direct query, even when the user set
their identity to **private** (`identity_public = false`). The app's UI always
respects `identity_public`, so this is not exposed in product, but RLS does not
enforce it at the row/column level.

- **Impact:** Medium. No email, legal name, or precise location is involved
  (`location` is a freeform, user-chosen area). Exposure is limited to optional,
  user-supplied fields and only to authenticated clients crafting raw queries.
- **Recommended fix (next security task):** move `gender`/`age`/`location` into a
  `profile_private` table with own-row RLS, and serve cross-user reads through a
  `SECURITY DEFINER` `public_profile(id)` function that returns those fields only
  when `identity_public` is true. This keeps the feed's handle/cosmetic joins
  working while making the privacy guarantee enforceable in the database. (Held
  for a dedicated, isolated migration because it touches identity read/write
  paths and the confession-author join.)

## Follow-ups
1. Implement the `profile_private` split for Finding 1.
2. Optional: email-less passkey login via a custom session-minting Edge Function
   (so identity accounts can use passkeys without first linking an email).
3. Periodic review of Edge Function secrets and RLS as new tables are added.
