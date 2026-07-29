# Cloudflare security ruleset (template)

> **Status:** Template for a future Cloudflare Pages canary. Production SPA today is
> **Vercel** (`astramatrix/vybz` → https://vybz.cloud). Do not flip DNS until the
> canary gate in [`../operations/DEPLOYMENT.md`](../operations/DEPLOYMENT.md) passes.

## Recommended WAF / Bot rules (when CF is fronting)

| Rule | Action | Notes |
|------|--------|-------|
| Rate limit `/functions/v1/storefront-checkout` | Challenge / block after burst | Protect Checkout Edge |
| Rate limit `/functions/v1/stripe-webhook` | Allow Stripe ASNs only if possible | Signature still verified in EF |
| Bot Fight Mode | On (non-enterprise) | Skip for authenticated SPA cookies carefully |
| Block countries (optional) | Off by default | Owner decision for alpha |
| Managed WAF (OWASP) | Medium | Log → challenge |

## Headers (Pages / Workers)

- Keep SPA CSP aligned with [`../../index.html`](../../index.html) / Vercel headers.
- Do not terminate Stripe webhooks through a Worker that strips `Stripe-Signature`.

## Cutover checklist

1. Deploy Pages canary on subdomain.
2. Apply this ruleset in log-only mode for 48h.
3. Compare Core Web Vitals vs Vercel.
4. Owner approval → apex cutover; keep Vercel rollback ready.
