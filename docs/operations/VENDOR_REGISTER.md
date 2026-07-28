# Vendor Register

> Living table of external vendors. Modes mirror
> [`../architecture/PROVIDER_ARCHITECTURE.md`](../architecture/PROVIDER_ARCHITECTURE.md).

| Vendor | Role | Mode | Notes |
|--------|------|------|-------|
| **Supabase** | Auth, DB, Storage, Edge, Realtime | `production` | `xixmneooyufbeftdfpcm`; Free until justified |
| **Stripe** | Checkout, Connect, webhooks | `production` | Acct `acct_1TwTEtAnnpt9OYZI`; success fees only |
| **Resend** | Transactional email | `hard_cap` | Domain `vybz.cloud`; From `VYBZ <noreply@vybz.cloud>` |
| **LiveKit** | Live SFU / voice | `hard_cap` | Degrade UI when allowance exhausted |
| **Groq** | Storefront copy | `free_only` | Template fallback when capped |
| **fal** | Visual stills | `prepaid_only` / `disabled` | Never decorative unmetered gen |
| **Vercel** | Current SPA host | `production` | `astramatrix/vybz` → vybz.cloud |
| **Cloudflare Pages** | Planned SPA host | `disabled` until canary | $0 static; avoid Pages Functions for core API |
| **OVH** | Server / Engine jobs / backups | `manual_approval` | Existing expense `51.210.209.112` |
| **Bunny** | Legacy media | `disabled` | Dormant EFs only; **do not re-enable** |
| **ExpressTURN** | Optional WebRTC TURN | `manual_approval` | Via `ice-servers`; STUN-only without secrets |
| **GitHub** | Origin | n/a | `ALaustrup/VYBZ` only |

Adapters under `infra/providers/*` land in later phases. Cost doctrine:
[`COST_CONTROL.md`](./COST_CONTROL.md).
