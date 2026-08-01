> **HISTORICAL ONLY — NOT AUTHORITATIVE — DO NOT USE FOR CURRENT IMPLEMENTATION OR SEQUENCING.**
>
> Superseded on 2026-08-01 by the five authorities: `VYBZ_MASTERPLAN.md`, `AGENTS.md`,
> `ARCHITECTURE.md`, `STATUS.md`, `IDEAS_BACKLOG.md`. Retained as a historical record only.

# VYBZ Relay

> Authoritative product brief. Accent: **blue / green**. Stages 1–4. No fake DSP.

## Purpose

Package delivery and distribution status for a release. Real partner delivery
and reconcile — never a fake “direct DSP” claim without a live connector.

## Customer

Artists ready to ship a package who need honest status: queued, submitted,
accepted, rejected, live — not marketing theater.

## Jobs

- Build a distribution package from approved release assets
- Deliver to a real partner (Phase 7: one partner minimum)
- Reconcile status into release destinations
- Surface blockers back to Prepare

## Data sketch

`distribution_*` packages · destinations · delivery attempts · status events ·
idempotency keys · links to `release_versions` / `release_approvals`.

## Cost behavior

Packaging free. Partner delivery may be usage-backed or partner fee — always
estimate → approval → reserve where VYBZ incurs cost. No silent retries that
burn budget.

## Copy one-liner

**Deliver the package. Know where it stands.**

## Design accent

Blue → green progress (`--accent-relay`). Stage stepper 1–4; status truth over
celebration animations.

## Stages (1–4)

1. Package freeze (approved assets + credits)
2. Destination select (real connectors only)
3. Submit / deliver
4. Reconcile status (accepted / rejected / live)

## DoD

- [ ] One real partner delivery path + status reconcile
- [ ] **No fake direct-DSP claims**
- [ ] Human approval before submit
- [ ] Loading / failed-delivery / partner-degraded states
