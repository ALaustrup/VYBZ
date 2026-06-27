# MYVYB Lifelines — Setup & Operations Runbook

## What it is
A peer-support feature: when someone's struggling, they tap **Talk to someone**
and are matched in seconds with a vetted volunteer ("Lifeline") for an
ephemeral 1:1 text conversation. Anonymous on both sides. Nothing recorded.

> **Lifelines are peer support, not professional crisis services.** Every
> surface in the app states this and prominently links **988** (US Suicide &
> Crisis Lifeline) for immediate danger.

## What's in the repo

| Layer | File |
|---|---|
| Schema + RPCs | `apps/veiled/supabase/migrations/20260626_0004_lifelines.sql` |
| Client lib | `apps/veiled/src/lib/backend.ts` (`becomeLifeline`, `setLifelineAvailable`, `lifelineRequest`, `lifelineCancel`, `lifelineEnd`, `lifelineCountAvailable`, `subscribeLifelineMatch`, `joinLifelineRoom`) |
| Requester sheet | `apps/veiled/src/components/LifelineSheet.tsx` |
| Volunteer opt-in | `apps/veiled/src/components/LifelineOptIn.tsx` |
| Store actions | `apps/veiled/src/store/AppStore.tsx` (`openLifeline`, `closeLifeline`, `lifelineOpen`) |

## To deploy

1. Apply the migration:

```bash
supabase db push   # or paste 20260626_0004_lifelines.sql into the SQL editor
```

That's it — no new edge function, no new secrets. Lifelines uses Supabase
realtime broadcast (already configured) for the ephemeral chat room, and
postgres-realtime (already enabled) for the requester→match signal.

2. Deploy the web build. Verify with two devices:
   - Device A (verified, 18+, sex set): Settings → Lifelines → Become → On shift.
   - Device B (any verified member): Settings → Talk to someone → Talk now.
   - Should connect in < 5 seconds. End from either side; verify both unwind.

## Eligibility (server-enforced)

| Role | Requirements |
|---|---|
| **Requester** | Verified email, age set, not banned. (Anyone can reach out.) |
| **Lifeline** | Verified email, **18+**, sex set, not anonymous, not banned. Accepts the code of conduct in the opt-in card. |

## Code of conduct (shown on opt-in)

> Listen with kindness. Never share private info you receive. Never offer
> medical or legal advice. Encourage anyone in immediate danger to call **988**
> (US) or their local emergency number.

## Matching rules

- Same **age layer** (teens with teens, adults with adults).
- Same **language** (defaults to `en`; volunteer can set their language).
- **Longest-waiting** Lifeline picked first.
- Lifeline goes off-shift while in session; flips back on automatically when
  the requester ends the chat.

## Auto-end & moderation

- **No content is stored** — only the session shell (start/end times, IDs).
- Either party can end the chat instantly.
- For repeat bad actors: a `lifeline_completed` count plus future reports tab
  in the operator console (post-MVP) lets ops suspend a volunteer.

## What's NOT in v1 (deliberately, alpha-disciplined)

- **Voice via LiveKit** — easy lift on top of this (the room id is the session
  id), but text is faster to ship and gentler for first contact.
- **Trained-listener partnership integration** (988, Trevor Project,
  Befrienders) — needs legal + partnership work, not code.
- **Operator dashboard tab for Lifelines** — current ops console handles
  reports + bans generically; a dedicated Lifelines tab is a follow-up.
- **Recording for safety review** of Lifeline sessions — by design (the chat
  is sacred). If we ever need to investigate abuse, we have the session row +
  the abuse-report flow, never content.

## Tuning knobs

`apps/veiled/supabase/migrations/20260626_0004_lifelines.sql`:

- Default language: `lifeline_request(p_language)` defaults to `'en'`.
- Add a queue-timeout / no-show eviction in `lifeline_request` if queues grow.
