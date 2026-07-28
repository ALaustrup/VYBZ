# RLS Policy Guide

## Principles

1. Default deny; grant explicit `SELECT`/`INSERT`/`UPDATE`/`DELETE` per role.
2. User-owned rows: `auth.uid() = user_id` (or membership join).
3. Public artist surfaces: narrow columns via views/policies — no private masters.
4. Money / ledger / Connect: JWT + ownership; webhook paths use service role on Edge only.
5. SECURITY DEFINER RPCs: fixed `search_path`; `REVOKE EXECUTE FROM anon` when auth-only.
6. Storage: bucket policies match product (public CDN vs private masters/zips).

## Suite hotspots

| Area | Tables / buckets (indicative) | Care |
|------|-------------------------------|------|
| Profiles / artist | `profiles`, public views | Intentional public fields only |
| Live / rooms | `rooms`, memberships, live sessions | `can_access_room` |
| Tips / Vc | ledgers, Stripe-linked rows | No client forge of balances |
| Music Repos | CAS paths per `0059`/`0060` | Owner + collaborators |
| Storefront | packs, purchases, `storefront-*` buckets | Seller vs buyer vs public slug |
| Watermark / Sentinel | provenance rows | Writer auth; detect admin |

## Checklist before merge

- [ ] Policy covers new table
- [ ] No `USING (true)` on private data
- [ ] Advisors reviewed for new DEFINER functions
- [ ] Client uses anon key only

See [`MIGRATIONS.md`](./MIGRATIONS.md), [`../PRODUCTION_HARDENING.md`](../PRODUCTION_HARDENING.md).
