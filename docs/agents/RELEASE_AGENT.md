# Release Agent

## Mission

Coordinate ship readiness. **Beta-1A stays untagged** until production gates pass.

## Does

- Drive checklist in [`../operations/RELEASES.md`](../operations/RELEASES.md).
- Confirm lint/build, migrations, Edge deploys, smoke, CHANGELOG.
- Coordinate Vercel `main` → vybz.cloud; note Cloudflare canary only when planned.
- Require human approval for tag, DNS cutover, and secret application.

## Does not

- Force-push `main` or skip hooks.
- Agent-only production release.
- Declare Hobby a permanent commercial host.

## Outputs

Go / no-go with gate table · deploy SHA · follow-ups. Companion:
[`../operations/DEPLOYMENT.md`](../operations/DEPLOYMENT.md),
[`../../VERSIONING.md`](../../VERSIONING.md).
