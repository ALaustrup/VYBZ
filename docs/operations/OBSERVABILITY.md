# Observability

## Current sources

| Signal | Where | Use |
|--------|-------|-----|
| Edge / API logs | Supabase Dashboard → Edge Functions | Auth errors, webhook failures |
| SPA build / runtime | Vercel deployments + runtime logs | Deploy regressions, 5xx |
| Advisors | Supabase advisors | RLS / SECURITY DEFINER warnings |
| Client | Browser console (dev) | Never ship debug secrets |

Prefer project ref `xixmneooyufbeftdfpcm` only. Do not invent a second APM until Cost
Sentinel / Phase needs justify it ($0 new fixed subs).

## Planned: `nightly-health`

Scheduled check (Edge cron or OVH job) that probes:

- Storage public CDN (`site-visuals` sample object)
- `livekit-token` configured (auth’d smoke, no room spam)
- Resend domain / send budget headroom
- Stripe webhook recent success
- Passkey RP host allow-list includes `vybz.cloud`
- Cost / ProviderMode snapshot vs caps

Alert owner on hard failures; soft failures → SEV3 degrade path.

## Principles

- Logs are evidence, not a chat dump of secrets.
- Correlate deploy SHA with incidents.
- Cost Sentinel weekly report is an observability artifact.

[`INCIDENT_RESPONSE.md`](./INCIDENT_RESPONSE.md), [`INFRA_GATES.md`](../INFRA_GATES.md).
