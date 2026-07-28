# Cost Inventory

Target: **$0 in new fixed monthly platform subscriptions**, excluding domain renewal,
payment processing fees, existing OVH, and user-approved paid compute.

## Free / local (preferred)

| Capability | Where | Platform $ |
|------------|-------|------------|
| Header / peak / silence / basic spectrum | Browser worker | $0 |
| Full loudness, FFmpeg, batch | VYBZ Engine | $0 platform compute |
| Readiness metadata rules | Browser | $0 |
| Artwork dimension / format checks | Browser | $0 |
| Music Repos hash + sync | Browser + Engine | Storage egress only |

## Usage / gated

| Capability | Provider | Mode | Notes |
|------------|----------|------|-------|
| Pack copy | Groq | `free_only` | Template fallback when capped |
| Visual stills | fal | `prepaid_only` | Cost reservation; Vc debit today |
| Pack art SVG | Edge (deterministic) | free | Prefer non-fal |
| Live sessions | LiveKit | `hard_cap` | Stop new sessions when allowance exhausted |
| Email | Resend | `hard_cap` | Priority queue |
| Checkout | Stripe | success fees | No fixed SaaS fee |
| Managed mastering (future) | TBD | `manual_approval` | Never auto-upgrade |

## Cost Sentinel (planned)

Track quotas · estimate spend · enforce user/feature/provider caps · degrade to local ·
weekly reports · block recursive jobs. Code: Phase 9 / Commit 4 precursor in Phase 1 models.

Doctrine: [`../operations/COST_CONTROL.md`](../operations/COST_CONTROL.md).
