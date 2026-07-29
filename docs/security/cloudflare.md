# Cloudflare security ruleset (VYBZ)

> **Import file:** [`cloudflare-ruleset.yml`](./cloudflare-ruleset.yml)  
> Tuned for Vite SPA routes + Supabase Edge (`/functions/v1/`).  
> Production SPA today is still **Vercel** (`astramatrix/vybz` → https://vybz.cloud).
> Apply this ruleset only on hostnames Cloudflare already proxies (staging first).

## Import (staging → production)

1. Cloudflare Dashboard → **Security** → **WAF** → **Rulesets** → **Add ruleset** → **Import rules**.
2. Paste / upload [`cloudflare-ruleset.yml`](./cloudflare-ruleset.yml).
3. Save on the **staging** zone; run smoke below.
4. Export / re-import the same YAML on the **production** zone once staging is green.

## Smoke-test checklist (staging)

| Path | Expected |
|------|----------|
| `/`, `/pack/<slug>`, `/enter` | 200 |
| `POST /functions/v1/stripe-webhook` | 200 / 400 (signature) — not 403 from WAF |
| `/.%2e/etc/passwd` or path with `../` | **403** |
| `/?__proto__[x]=1` | **403** |

## Also recommended (dashboard toggles, not in YAML)

| Control | Action | Notes |
|---------|--------|-------|
| Rate limit storefront checkout | Challenge after burst | Path `/functions/v1/storefront-checkout` |
| Stripe webhook | Prefer allowlisting Stripe egress if available | Signature still verified in Edge |
| Bot Fight Mode | On (non-enterprise) | Watch authenticated SPA cookies |
| Managed WAF (OWASP) | Medium · log then challenge | Complements custom rules |

## Headers / cutover

- Keep SPA CSP aligned with `index.html` / Vercel headers.
- Do not terminate Stripe webhooks through a Worker that strips `Stripe-Signature`.
- Apex cutover to Cloudflare Pages remains gated by [`../operations/DEPLOYMENT.md`](../operations/DEPLOYMENT.md).
