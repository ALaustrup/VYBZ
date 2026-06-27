# MYVYB Roadmap — Lives First

Ordered so each step *reinforces* the one before it. Safety > growth > polish
(per `.cursorrules`). Lives saved before anything else.

---

## ✅ Already shipped on `cursor/fresh-reset-media-overhaul-8c67`

- Find Yours one-tap entry, username system, Customize Username, VerifyGate.
- Comments-only feeds, signed-URL private media, watermark, right-click guard.
- Matchmaking v2 (multi-signal: co-Vyb + co-Fail − disagreement penalty).
- Unified push (web; mobile-ready).
- Live MVP (LiveKit-powered streamer + swipe Vyb/Fail carousel + reports +
  community auto-end + opt-in record flag + lazy chunk).
- **Lifelines MVP** ← *this session* — see `LIFELINES_SETUP.md`.

---

## Now — the next four builds, in order

### 1. Live deploy & end-to-end verification (ops, no app code)
What: apply the four migrations, set LiveKit secrets, deploy `live-token` +
`push-send`, deploy the web build, two-device smoke.
Why first: Live and Lifelines both need to actually run.
See: `LIVE_SETUP.md`, `LIFELINES_SETUP.md`.

### 2. Lifelines v2 — voice + partnership-ready
What:
- LiveKit-backed voice on top of the existing Lifeline session (text stays;
  voice is opt-in toggle).
- Operator console tab: list of recent ended-with-reports sessions; one-tap
  suspend a volunteer.
- Partnership shim: post-session, if the requester asks, surface a single curated
  resource (988 / Crisis Text Line / The Trevor Project / Befrienders) by
  geo/age.
- Volunteer training acknowledgement: link to a partner's listener module
  before becoming a Lifeline (e.g. Crisis Text Line listener training).

### 3. Stream chat overlay (live + lifeline reuse the same realtime layer)
What: real-time chat on every live stream, with streamer moderation controls
(pin, mute, slow-mode). Community kill-switch: N mutes from distinct viewers
auto-silence a sender (mirrors live's Fail-rate auto-end philosophy).

### 4. V¢ tipping for streamers (new V¢ sink, drives verification)
What: 1/5/25 V¢ tap-to-tip on any live stream, debounced floating animation,
weekly streamer payout in V¢. Guests blocked → AccountGate. Reuses
`tip_credits` RPC. **No platform cut in alpha.**

---

## After that — the social-good pillars (alpha-adjacent, partnerships required)

### Pillar A — Lifelines (live; deepen)
Already shipped + v2 above. Continuous: every confession's crisis hook routes
to a human within seconds, 24/7 once the volunteer pool exists.

### Pillar B — Resonance (empathy → real-world dollars)
Convert Vybs/V¢ into measurable real-world donations to vetted causes.
- "Vyb-stream charity events" — live streamers run a benefit; viewer Vybs
  matched into real donations from a sponsor pool.
- "Confession resonance funding" — when a confession crosses N Vybs from
  distinct accounts, MYVYB donates to a related vetted cause.
- "Kindness ledger" — each user's private monthly impact summary (real
  dollars unlocked through their Vybs). Never displayed publicly by default.
- Rails: PayPal Giving Fund / Benevity / GlobalGiving. **V¢ never withdrawable
  to self** — outgoing-only, keeps MYVYB out of money-transmitter regulation.

### Pillar C — Anchor (daily companion for the structurally lonely)
Light-touch daily 1:1 between a volunteer Anchor and a Companion (elderly
isolated, hospital patients, postpartum, deployed military families,
neurodivergent adults). One nudge a day, never punitive. Reuses Matchmaking v2
for peer-support compatibility. Partnerships: AARP, eldercare consortiums,
Postpartum Support International, Operation We Are Here.

---

## Platform packaging

### Mobile (Android + iOS) — Capacitor wrap
Foundation in `capacitor.config.ts` + `MOBILE_VR_MASTERPLAN.md`. Critical
decisions before native builds: **IAP migration** (StoreKit / Play Billing)
for Godmode + tip wallets, and **store-policy review** for Live + NSFW + random
peer chat (Apple/Google scrutiny is heavy on UGC live video and minor safety).

### VR (Quest 2/3/3S)
`/xr` already WebXR. Two routes:
- Fast: ship `/xr` PWA in the Meta Quest Browser.
- Store: wrap WebXR-loading Android APK and submit to Meta Horizon Store.

---

## How we decide what's next

1. Does it save a life or prevent harm? Highest priority.
2. Does it strengthen the platform Lifelines runs on (reliability, reach,
   moderation, verified volunteer pool growth)? Next.
3. Does it reinforce community-driven kindness (Resonance, Anchor)? Next.
4. Is it pure feature work? Only after the above are healthy.
