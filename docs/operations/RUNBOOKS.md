# Runbooks (index)

| Runbook | When | Doc |
|---------|------|-----|
| Deploy SPA | Merge to `main` / promote | [`DEPLOYMENT.md`](./DEPLOYMENT.md) |
| Deploy Edge | Function code or secrets change | [`../engineering/EDGE_FUNCTIONS.md`](../engineering/EDGE_FUNCTIONS.md) |
| Apply migration | Schema change | [`../engineering/MIGRATIONS.md`](../engineering/MIGRATIONS.md) |
| Infra verify | After secrets / vendor change | [`../INFRA_GATES.md`](../INFRA_GATES.md) |
| Cost / provider mode | Cap hit or new paid path | [`COST_CONTROL.md`](./COST_CONTROL.md) |
| Stripe webhook | Tips / storefront fulfillment broken | [`../PRODUCTION_HARDENING.md`](../PRODUCTION_HARDENING.md) |
| LiveKit / live | Go Live / room voice fail | [`../INFRA_GATES.md`](../INFRA_GATES.md) |
| Resend / email | Auth or digest mail fail | Vendor Register + Resend dashboard |
| Backup / restore | Data loss or Free-plan risk | [`BACKUP_AND_RESTORE.md`](./BACKUP_AND_RESTORE.md) |
| Incident / rotate | SEV1–2 | [`INCIDENT_RESPONSE.md`](./INCIDENT_RESPONSE.md) |
| Offboard access | Contractor / key leave | [`OFFBOARDING.md`](./OFFBOARDING.md) |
| Release tag | Gates green | [`RELEASES.md`](./RELEASES.md) |

**Do not** runbooks that re-enable Bunny Stream/Storage as media origin.
Media = Supabase Storage; live = LiveKit.
