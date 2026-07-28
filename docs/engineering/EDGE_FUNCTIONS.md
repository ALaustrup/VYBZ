# Edge Functions

Authoritative inventory: [`../architecture/EDGE_FUNCTION_REGISTRY.md`](../architecture/EDGE_FUNCTION_REGISTRY.md).

## Deploy

```bash
npx supabase functions deploy <name> --project-ref xixmneooyufbeftdfpcm
```

Set secrets with `supabase secrets set` — never commit them. Redeploy after code changes;
secret-only changes usually do not require rebuild but verify runtime.

## Suite keepers (non-exhaustive)

`waitlist-*`, `weekly-digest`, `audio-play`, `livekit-token`, `passkey`, `oauth-*`,
`embed`, `ice-servers`, `stripe-*`, `watermark*`, `vc-room-renewals`, `visual-generate`,
`storefront-pack-copy`, `storefront-pack-art`, `storefront-checkout`.

## Dormant — do not re-enable

`bunny-upload`, `bunny-sign`, `bunny-live`.

## Cost rules

- JWT on for paid/user compute (`visual-generate`, pack copy).
- Estimate/reserve before fal; Groq `free_only` with template fallback.
- Stripe webhook: verify signatures; fulfill storefront + tips idempotently.
- New functions require provider mode + registry row + human review for money paths.

Shared helpers under `supabase/functions/_shared/`. Lint/build SPA separately from EF Deno deploy.
