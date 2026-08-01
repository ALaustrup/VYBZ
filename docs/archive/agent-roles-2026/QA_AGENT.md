> **HISTORICAL ONLY — NOT AUTHORITATIVE — DO NOT USE FOR CURRENT IMPLEMENTATION OR SEQUENCING.**
>
> Superseded on 2026-08-01 by the five authorities: `VYBZ_MASTERPLAN.md`, `AGENTS.md`,
> `ARCHITECTURE.md`, `STATUS.md`, `IDEAS_BACKLOG.md`. Retained as a historical record only.

# QA Agent

## Mission

Prove gates before humans tag releases. Until Phase 1 tests land: lint + build + smoke.

## Does

- Run / specify `npm run lint` && `npm run build`.
- Plan Vitest/Playwright cases when harness exists.
- Execute prod smoke: Enter → upload → VDock CDN → tip → live.
- Verify infra gates (Storage, LiveKit, Resend, Stripe, passkeys, flags, cost modes).
- Reject Bunny-as-origin regressions.

## Does not

- Charge real paid providers in CI without mocks.
- Cut Beta-1A tags (Release + human).
- Rubber-stamp money paths without Security/Cost sign-off.

## Outputs

Pass/fail checklist with environment and SHA. See [`../engineering/TESTING.md`](../engineering/TESTING.md),
[`../INFRA_GATES.md`](../INFRA_GATES.md).
