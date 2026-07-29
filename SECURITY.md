# SECURITY.md

> Suite security doctrine (Beta-1A). Product boundaries: [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md).
> Archived Music Hub–era notes: [`docs/archive/pre-suite-2026/SECURITY.md`](./docs/archive/pre-suite-2026/SECURITY.md).

## Principles

1. **Identity-first** — no anonymity; durable creator accounts (email + passkeys).
2. **Least privilege** — RLS on every user table; definer RPCs for privileged writes.
3. **One Supabase project** — never share service_role with the client; never commit secrets.
4. **Storage-only media origin** — private masters in `audio-assets` / repo blobs; public CDN only for approved public assets (`site-visuals`, `media-public`, storefront previews).
5. **Honest security marketing** — watermark detection is evidentiary, not infallible.
6. **Human gates** — rights claims, contributor disputes, payment method changes, distribution submit, provider upgrades.

## Multi-client trust boundary

**VYBZ Desktop (Tauri) and VYBZ for Android (Capacitor) are untrusted clients.**
Native packaging does not secure secrets. Privileged actions stay behind RLS,
protected RPCs, Edge Functions, trusted workers, and verified billing webhooks.
No client may ship `service_role`, Stripe secrets, Resend keys, AI provider keys,
or signing secrets. Platform Bridge must use allowlisted native commands only
(no arbitrary shell / unrestricted FS). See Master Blueprint §16–17.

## Threat model (summary)

| Asset | Risks | Controls |
|-------|-------|----------|
| Unreleased audio | Leak, unauthorized download | Sentinel rooms, signed URLs, play/download limits, watermark manifests (Phase 6) |
| Masters / ZIPs | Hotlink, scrape | Private buckets; signed fulfillment only after paid order |
| Credits / splits | Fraudulent claims | Approval workflows; AI may not approve (Phase 3) |
| Payments | Webhook spoof; Connect abuse (tips) | Stripe signature verify; Express for tips only |
| Storefront settlement | Manual payout drift | `settlement_status`; owner Settle now RPC |
| Bridge/Engine | Remote code abuse | Device registration, signed jobs, sandboxed command templates, no arbitrary shell |
| Desktop native cmds | Path traversal, injection, symlink | Allowlists, path validation, process isolation |
| Local caches | Leak after collaborator removal | Cache purge on access loss; encrypted session stores |
| Deep links | Interception / OAuth abuse | App Links verification; state params; web fallback |
| Update channels | Compromised artifacts | Signed updates; isolated signing keys; checksums |
| Accounts | Session theft | Passkeys preferred; short-lived tokens; platform secure storage |

## Identity and organizations

- Supabase Auth + WebAuthn passkeys (`passkey` Edge Function).
- Planned: `organizations` / `organization_members` with explicit roles (Phase 1+).
- Staff/mod paths remain separate (`/admin`, `/mod`) with existing staff tables.

## RLS and RPC

- Prefer row ownership (`auth.uid()`) and membership checks.
- Money, tips, watermark events, repo commits: definer-security RPCs.
- Additive migrations must ship RLS + rollback notes.

## Media and secure sharing

- **Do not** treat Bunny CDN/Stream as active origin.
- Watermark embed/detect Edge Functions exist; expand into Sentinel recipient manifests later.
- Provenance / C2PA-related ledger tables remain; extend with signed manifests in Sentinel.

## Payments

- Stripe Checkout + webhook verification required.
- **Storefront packs:** platform Checkout (no Connect transfer). Producer paid
  off-platform (ACH / Zelle / Vc); `settlement_status` tracks manual settle.
- **Tips / Connect Express:** unchanged for creators who complete ID verification.
- Storefront `kind=storefront` fulfillment via Resend signed ZIP (24h).
- Cost reservations required before paid AI/mastering jobs (Phase 1 / Commit 4).

## Secrets

| Secret | Where |
|--------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | Server / Edge / CI only |
| Stripe secret + webhook secret | Edge / webhook only |
| `RESEND_API_KEY` | Edge only |
| `FAL_KEY`, `GROQ_API_KEY` | Edge secrets; never `VITE_*` |
| `LIVEKIT_*` | Edge token mint |

## Incident response

See [`docs/operations/INCIDENT_RESPONSE.md`](./docs/operations/INCIDENT_RESPONSE.md).
Rotate keys via documented infra commands when those land; until then, Supabase/Vercel/Resend dashboards with dual control.

## Retention

Define per product in legal drafts (counsel). Engineering default: soft-delete where possible;
immutable audit for money, watermark, and distribution events.
