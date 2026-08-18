# 0006 — Session provenance

**Date:** 2026-08-17 · **Status:** Accepted · **Decided by:** owner

Decision records are append-only. This record does not edit [`0002`](./0002-watermark-is-forensic-not-access-control.md), [`0004`](./0004-live-mix-streaming-platform.md), or [`0005`](./0005-airtime-credits.md).

## Context

Distributors are asking artists to show that a release came from a real session. VYBZ already has a forensic watermark, an asset `provenance_ledger`, an optional C2PA worker, live sessions, and ATC host-consume rows.

Those pieces prove **a copy**, **an upload**, or **that hosting time was burned**. They do not prove a mix was composed by a human, and they must not be described as a Spotify/DistroKid pass.

Living Mix (`/library/mix`) is a catalog sequencer. `liveSession.ts` is a 1:1 DM call. Neither is a public live mix.

## Decision

**A sealed public live mix may emit a session-provenance package.** It records what was measured about the session. It does not record what we cannot measure.

- Binds only to `live_sessions` (public live mix), never to Living Mix or 1:1 calls.
- **Full** strength only if `airtime_ledger` has `host_consume` for that session. Otherwise **thin**.
- Signing material stays on the server. The browser does not hold a session private key.
- Client-sent mix hashes and pointer/MIDI/mic flags are **declared**.
- ATC burned, host id, timestamps, and the event chain are **measured**.
- “Not fully AI-generated” / “human-composed” is **refused**. Unknown reads **Not measured**.
- Forensic watermark and the C2PA worker stay. This feature does not replace them (0002 still holds).
- Stripe and ATC grant/earn/consume formulas are not changed. Provenance may *read* `host_consume` rows.

## Consequences

- `PRODUCT.md` is Version 5.
- `HUMAN_PROVENANCE` and the `humanProvenance` gate live in `src/product/invariants.ts`.
- Phase 1 is **INFRASTRUCTURE ONLY**: tables + RPCs, no UI, not applied until asked.
- Later UI copy says **Session provenance**, not “Human certified.”
