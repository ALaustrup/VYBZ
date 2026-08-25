# Infrastructure

> Ops reference for hosts and backends. Not product identity. Target: **$0 new fixed monthly
> platform subscriptions** (domain, Stripe fees, existing OVH excluded).

| Layer | Current | Planned | Mode |
|-------|---------|---------|------|
| **SPA host** | Vercel (`astramatrix/vybz` ← GitHub `main`) | Cloudflare Pages canary | Vercel `production` until verified cutover |
| **API / data** | Supabase `xixmneooyufbeftdfpcm` (us-west-1) | Same project | `production` |
| **Media origin** | Supabase Storage only | Same | Bunny EFs **dormant** — do not re-enable |
| **Live SFU** | LiveKit | Same; hard-cap UX | `hard_cap` |
| **Email** | Resend `vybz.cloud` | Same | `hard_cap` |
| **Payments** | Stripe `acct_1TwTEtAnnpt9OYZI` | Same | success fees only |
| **Jobs / backups** | OVH `51.210.209.112` (existing) | Nightly logical DB dump | `manual_approval` |
| **Local compute** | `tools/vybz-bridge` → VYBZ Engine | Primary for FFmpeg / loudness | $0 platform |

## Laws

1. Never point the app at MYVYB or any non-VYBZ Supabase project.
2. No second database or auth system.
3. Prefer browser → Engine → Edge → free external → paid external.
4. Do not add fixed SaaS subscriptions without owner approval.
5. Commercial traffic must not permanently rely on Vercel Hobby.

See [`VENDOR_REGISTER.md`](./VENDOR_REGISTER.md), [`DEPLOYMENT.md`](./DEPLOYMENT.md),
[`COST_CONTROL.md`](./COST_CONTROL.md).
