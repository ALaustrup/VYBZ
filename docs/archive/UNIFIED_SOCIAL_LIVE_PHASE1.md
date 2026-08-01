> **HISTORICAL ONLY — NOT AUTHORITATIVE — DO NOT USE FOR CURRENT IMPLEMENTATION OR SEQUENCING.**
>
> Superseded on 2026-08-01 by the five authorities: `VYBZ_MASTERPLAN.md`, `AGENTS.md`,
> `ARCHITECTURE.md`, `STATUS.md`, `IDEAS_BACKLOG.md`. Retained as a historical record only.

# Unified Social Live — Phase 1 ops

Schema: `supabase/migrations/20260724_0061_unified_social_live.sql`

## V¢ renewals cron (service role)

Invoke hourly (Supabase scheduled Edge Function or external cron):

```http
POST /functions/v1/vc-room-renewals
Authorization: Bearer <SERVICE_ROLE_KEY>
```

Minimal function body (Phase 2 may flesh this out):

```ts
const { data, error } = await supabaseAdmin.rpc("process_vc_room_renewals", { p_limit: 200 });
```

`process_vc_room_renewals` is **revoked from `authenticated`** — only `service_role`.

## Client RPCs (Phase 3+)

| RPC | Role |
|-----|------|
| `top_live_sessions(n)` | Social tab Top N lives |
| `list_social_rooms` | Discover premium/free social rooms |
| `create_social_room` | Owner creates free/premium room |
| `subscribe_room_vc` | Debit V¢ (`mod_points`) for a period |
| `cancel_room_subscription` | Cancel at period end |
| `can_access_room` | Gate messages / future voice tokens |

## Closed-loop V¢

Balance = `profiles.mod_points`. Room earnings credit the owner’s `mod_points` only — **no cash-out**.
