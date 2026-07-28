# Deployment

## Production path (current)

| Item | Value |
|------|--------|
| GitHub | `ALaustrup/VYBZ` · integration branch `main` |
| Suite work | `suite-genesis` until merge |
| Host | Vercel project `astramatrix/vybz` |
| Domain | https://vybz.cloud |
| Gate | `npm run lint` && `npm run build` |

Push/merge to `main` deploys the SPA. Edge functions deploy separately via Supabase CLI.
Never commit `service_role`, `sbp_`, Stripe secrets, or large media loops.

## Vercel plan rule

**Do not use Hobby as a permanent commercial host.** Production commercial traffic
requires Pro (or equivalent) **or** verified migration to Cloudflare Pages.

## Cloudflare Pages canary (planned)

1. Build with same Vite output; env: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` only.
2. Canary subdomain; do **not** move apex until smoke passes.
3. Keep API on Supabase Edge — avoid Pages Functions for core money/auth paths.
4. Compare CSP, PWA SW, SPA rewrites, and CDN `site-visuals` loads.
5. Cutover DNS only after owner approval; keep Vercel rollback ready.

## Post-deploy smoke

Enter → upload → `/u/:id` → VDock (CDN loops) → tip → brief live.
See [`RELEASES.md`](./RELEASES.md), [`../INFRA_GATES.md`](../INFRA_GATES.md).
