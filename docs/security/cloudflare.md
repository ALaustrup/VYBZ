# Cloudflare security ruleset (VYBZ)

> **Import file:** [`cloudflare-ruleset.yml`](./cloudflare-ruleset.yml)  
> Ruleset name: **`vybz-cloud-spa-edge`**  
> **Production status:** **active** on zone `vybz.cloud` since **2026-07-30**  
> (ruleset id `cd57debe6da141c18d4adcaed440c319`).  
> Free plan: block expressions use `contains` only (`matches`/regex needs Business / WAF Advanced).
> Tuned for Vite SPA routes + Supabase Edge (`/functions/v1/`).

## Staging WAF activation

1. Log in to Cloudflare → select the **staging** zone (e.g. `staging.vybz.cloud`).
2. **Security** → **WAF** → **Rulesets** → **Add ruleset** → **Import rules**.
3. Paste the contents of [`cloudflare-ruleset.yml`](./cloudflare-ruleset.yml) and save.
4. Run the smoke table below against the staging hostname.

## Smoke test (staging)

| Request | Expected |
|---------|----------|
| `GET /` | 200 OK |
| `GET /pack/<any-slug>` | 200 OK |
| `GET /enter` | 200 OK |
| `POST /functions/v1/stripe-webhook` (test JSON) | 200 / 400 — **not** WAF 403 |
| `GET /.%2e/etc/passwd` | **403** Forbidden |
| `GET /?__proto__[x]=1` | **403** Forbidden |

Tip — Edge path probe:

```bash
curl -I -X POST https://staging.vybz.cloud/functions/v1/stripe-webhook
```

(Use the real staging hostname if different.)

## Promote to production

If all staging checks pass:

1. Repeat import on the **production** zone (`vybz.cloud`).
2. Name the ruleset the same (`vybz-cloud-spa-edge`); set to **Deploy** immediately.
3. Re-run the smoke table against `https://vybz.cloud` (and Supabase Edge host if WAF sits in front of it).
4. Record go-live in [`SECURITY.md`](../../SECURITY.md) under **Edge & WAF**:

   `**WAF active:** YYYY-MM-DD (ruleset: vybz-cloud-spa-edge)`

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
