# Provider Architecture

## Mode enum

```ts
type ProviderMode =
  | "disabled"
  | "free_only"
  | "prepaid_only"
  | "hard_cap"
  | "manual_approval"
  | "production";
```

Default optional providers to `disabled` or `free_only`.

## Inventory

| Provider | Role | Launch mode | Notes |
|----------|------|-------------|-------|
| **Supabase** | Auth, DB, Storage, Edge, Realtime | `production` | Project `xixmneooyufbeftdfpcm`; Free plan until justified upgrade |
| **Stripe** | Checkout, Connect, webhooks | `production` | No fixed platform fee; success fees only |
| **Resend** | Transactional email | `hard_cap` | Free: 3k/mo, 100/day; prioritize auth/pay/approvals |
| **LiveKit** | Live SFU / voice | `hard_cap` | Build plan hard allowance; degrade UI when exhausted |
| **Groq** | Storefront copy (and similar) | `free_only` | Treat free limits as ceiling; template fallback |
| **fal** | Visual generation | `prepaid_only` / `disabled` | Never decorative unmetered generation |
| **Vercel** | Current SPA host | `production` | Commercial deploy needs Pro or migrate host |
| **Cloudflare Pages** | Planned SPA host | `disabled` until canary | $0 static; avoid Pages Functions for core API |
| **OVH** | Existing server / Engine jobs / backups | `manual_approval` | Existing infra expense |
| **Bunny** | Legacy media | `disabled` | Dormant EFs only; do not re-enable |

Adapters and `infra/providers/*` land in later phases. See [`../operations/VENDOR_REGISTER.md`](../operations/VENDOR_REGISTER.md)
and [`COST_INVENTORY.md`](./COST_INVENTORY.md).
