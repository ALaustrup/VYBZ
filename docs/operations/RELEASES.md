# Releases

> Versioning companion: [`../../VERSIONING.md`](../../VERSIONING.md).

## Beta-1A (Suite Genesis)

**Untagged** until production gates pass:

- [ ] Docs exit gate (Phase 0) complete
- [ ] Shell + cost kernel + Prepare scan foundation (Phase 1+)
- [ ] `npm run lint` && `npm run build` clean on release commit
- [ ] Infra gates green: Storage CDN, LiveKit token, Resend, Stripe webhook, passkeys
- [ ] Feature flags / cost modes reviewed ([`FEATURE_FLAGS.md`](../engineering/FEATURE_FLAGS.md))
- [ ] Prod smoke on vybz.cloud (Enter → upload → VDock → tip → live)
- [ ] No Bunny re-enable; media = Storage + LiveKit only
- [ ] Owner secrets present where alpha surfaces need them (`FAL_KEY`, `GROQ_API_KEY`, etc.)
- [ ] CHANGELOG entry + human Release Agent approval

Do **not** cut the `Beta-1A` tag early.

## Checklist (every ship)

1. Branch / PR reviewed; no secrets in tree.
2. Lint + build.
3. Migrations applied (additive only) if schema changed.
4. Edge functions redeployed if touched.
5. Smoke + spot-check RLS on money/live tables.
6. Tag only when VERSIONING criteria met; announce briefly in CHANGELOG.

Human gate: no agent-only production release.
[`AGENTS.md`](../../AGENTS.md).
