# VYBZ Live

> Authoritative product brief. Accent: **crimson**. LiveKit hard-cap degrade.

## Purpose

Performances, sessions, and listening events over LiveKit. Limited free Live;
degrade honestly when allowance is exhausted.

## Customer

Artists going live for fans; audiences joining sessions from Artist / Home /
discover adjacency.

## Jobs

- Host or join a LiveKit session (`livekit-token` EF)
- Enforce entitlements and room access
- Degrade: stop new sessions when hard cap hit; clear user-facing copy
- Optional recording / VOD only via approved Storage paths — not Bunny origin

## Data sketch

Existing live stream / room tables · access grants · LiveKit session metadata ·
usage / quota events for Cost Sentinel.

## Cost behavior

LiveKit = **`hard_cap`**. Free tier limited. When allowance exhausted: **no new
sessions**; existing policy may wind down gracefully. Never silent overage.
Estimate/reserve for any paid expansion.

## Copy one-liner

**Show up live. Cap when the meter says stop.**

## Design accent

Crimson (`--accent-live`). High-energy stage, but degrade banners are calm and
literal — no fake “unlimited live.”

## DoD

- [ ] Host/join via LiveKit token path
- [ ] Hard-cap degrade with explicit UI
- [ ] Access-denied / offline / reconnect states
- [ ] No Bunny reintroduction as media origin
