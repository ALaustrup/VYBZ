# Infra Gates

> Production blockers. Suite Genesis / Beta-1A are release-era labels, not product identity. Companion: [`PRODUCTION_HARDENING.md`](./PRODUCTION_HARDENING.md).
> **No Bunny Stream / Bunny CDN gates** — media origin is Supabase Storage; live is LiveKit.

Degrade gracefully when a gate is unset; do not fake-ship.

| Gate | Without | With |
|------|---------|------|
| **Storage CDN** | Broken / local-only visuals | Public `site-visuals` (+ media buckets) load on vybz.cloud |
| **LiveKit token** | No reliable live / room voice | `livekit-token` + `LIVEKIT_*` secrets |
| **Resend domain** | Auth/pay mail fail | Verified `vybz.cloud`; From `VYBZ <noreply@vybz.cloud>` |
| **Stripe webhook** | Tips / storefront not fulfilled | Signature verify; redeployed `stripe-webhook` |
| **Passkeys** | WebAuthn fail on prod host | `passkey` RP allow-list includes `vybz.cloud` |
| **Feature flags** | Wrong surfaces live | `src/lib/flags.ts` matches intent |
| **Cost modes** | Silent paid spend | ProviderMode per [`operations/VENDOR_REGISTER.md`](./operations/VENDOR_REGISTER.md) |

Optional: managed TURN via `ice-servers` (`TURN_*`) for hard NAT — not a Bunny dependency.

## Verify

```bash
# CDN object (example)
curl -I "https://xixmneooyufbeftdfpcm.supabase.co/storage/v1/object/public/site-visuals/"

# After auth: livekit-token invoke should mint JWT when LIVEKIT_* set
# Stripe: Dashboard → Webhooks → recent successes for vybz endpoints
# Resend: domain verified; daily/monthly headroom under hard_cap
```

Product smoke: Enter → upload → VDock → tip → brief live.
Admin / `api.fetchInfraGates()` may expose probes; do **not** probe dormant `bunny-*`.

## Secrets rule

Never put privileged keys in `VITE_*`. Set via `supabase secrets set --project-ref xixmneooyufbeftdfpcm`.
Human gate for payments and plan upgrades: [`operations/PROVISIONING.md`](./operations/PROVISIONING.md).
