# Backup and Restore

## Current posture

| Asset | Strategy | Notes |
|-------|----------|-------|
| Supabase Free | Platform PITR / backups per plan limits | Do not assume long retention |
| Storage buckets | Object durability via Supabase | Large media not in git |
| Git | `ALaustrup/VYBZ` | Source of truth for code |
| Secrets | Dashboard / CLI only | Never in repo or chat history |

Free-plan limits are a **known risk**. Upgrade only with owner approval after Cost Sentinel
review — not by agent default.

## Planned: nightly logical backup → OVH

1. `pg_dump` (logical) of project `xixmneooyufbeftdfpcm` on a schedule.
2. Encrypt at rest; land on existing OVH host `51.210.209.112`.
3. Retain N days (owner-defined); verify restore quarterly.
4. Document restore runbook under [`RUNBOOKS.md`](./RUNBOOKS.md) when automation ships.

## Restore principles

- Restore to a **non-production** branch/project first when possible.
- Never overwrite production without dual human confirmation.
- Re-verify RLS, Storage policies, and webhook endpoints after restore.
- Rotate any secrets that may have been exposed during incident-driven restore.

See [`INCIDENT_RESPONSE.md`](./INCIDENT_RESPONSE.md), [`INFRASTRUCTURE.md`](./INFRASTRUCTURE.md).
