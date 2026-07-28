# Production Hardening — Suite Genesis

> Living checklist for Beta-1A readiness. Companion: [`INFRA_GATES.md`](./INFRA_GATES.md),
> [`SECURITY.md`](../SECURITY.md). Host: https://vybz.cloud · Supabase: `xixmneooyufbeftdfpcm`.

## Security invariants

- Client ships **only** `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (+ feature flags).
- No service_role, Stripe secret, LiveKit API secret, fal/Groq keys in `VITE_*` or `src/`.
- Passkeys / password auth; anonymous sign-in disabled.
- **Media origin = Supabase Storage only.** Bunny Edge functions stay dormant.
- Live tokens minted server-side (`livekit-token`); access via `can_access_room`.
- Stripe webhooks signature-verified; storefront fulfillment via updated `stripe-webhook`.
- RLS on money, live, repos, storefront tables — spot-check before each release.

## Edge inventory

Authoritative list: [`architecture/EDGE_FUNCTION_REGISTRY.md`](./architecture/EDGE_FUNCTION_REGISTRY.md).
Privileged keepers include `passkey`, `livekit-token`, `stripe-*`, `watermark*`,
`visual-generate`, `storefront-*`, `ice-servers`, `vc-room-renewals`. **`bunny-*` = do not re-enable.**

## Host / SPA (Vercel)

| Check | Expectation |
|-------|-------------|
| Security headers | `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`, Permissions-Policy |
| CSP | Allow Supabase, LiveKit, Stripe; tighten after smoke — never disable CSP |
| SPA rewrite | `/(.*) → /index.html` |
| Assets | `/assets/*` immutable cache |
| PWA | Precache must not pin stale HTML after deploy |

## Cost / provider caps

Paid paths require estimate → approve → reserve → reconcile ([`operations/COST_CONTROL.md`](./operations/COST_CONTROL.md)).
Optional providers default `disabled` / `free_only`; fal `prepaid_only`.

## Release hardening pass

1. `npm run lint` && `npm run build`
2. Confirm project ref `xixmneooyufbeftdfpcm` only
3. Infra gates green ([`INFRA_GATES.md`](./INFRA_GATES.md))
4. Rotate any secrets ever pasted into chat
5. Smoke: Enter → upload → VDock (CDN) → tip → live
6. Do **not** tag Beta-1A until gates pass ([`operations/RELEASES.md`](./operations/RELEASES.md))
