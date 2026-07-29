# Provisioning

> Planned infra workflow. Agents may draft plans; **humans** apply secrets and payments.

## Commands (planned)

| Stage | Intent | Notes |
|-------|--------|-------|
| `infra:plan` | Diff desired vs current providers/secrets/flags | Read-only; no spend |
| `infra:apply` | Apply approved changes | Requires human gate for money / secrets |
| `infra:verify` | Probe gates (Storage CDN, LiveKit, Resend, Stripe, passkeys) | See [`../INFRA_GATES.md`](../INFRA_GATES.md) |

Until scripts land in Phase 1+, use dashboard + CLI manually and record outcomes here / CHANGELOG.

## Human gates (never agent-solo)

- Purchasing or upgrading vendor plans
- Setting Stripe / Resend / fal / Groq / LiveKit / service_role secrets
- Enabling a provider mode above `free_only` / `prepaid_only`
- Production DNS / domain / Cloudflare cutover
- Tagging Beta-1A or promoting a release

## Apply checklist

1. Confirm project ref `xixmneooyufbeftdfpcm`.
2. Set secrets via `supabase secrets set` — never `VITE_*` for privileged keys.
3. Deploy only listed Edge functions; leave `bunny-*` dormant.
4. Run `infra:verify` / manual probes from [`INFRA_GATES.md`](../INFRA_GATES.md).
5. Smoke: Enter → upload → VDock → tip → brief live; CDN `site-visuals`.

See [`COST_CONTROL.md`](./COST_CONTROL.md) and [`AGENT_SYSTEM.md`](../agents/AGENT_SYSTEM.md).
