# 0002 — The watermark is forensic, not access control

**Date:** 2026-08-15 · **Status:** Accepted

## Context

A reasonable question came up: since VYBZ watermarks audio, can the watermark serve as the
security layer that authorises playback on The Station?

It cannot, and the reason matters enough to write down — because the assumption is intuitive
and will recur.

## What the watermark actually does

Measured from `supabase/functions/watermark/index.ts` on 2026-08-15:

- It runs **on download, not on upload.** The function verifies the download grant, fetches the
  **clean** original, embeds a spread-spectrum mark keyed to `uid | assetId | wmId`, appends to
  the provenance ledger, and returns that uniquely marked copy.
- **Stored originals are not watermarked.** There is no upload-time embedding.
- **WAV only.** If `parseWav` fails, it logs the grant and returns a plain signed URL with
  `watermarked: false`. Every other format is delivered unmarked.
- It is wired only to `downloadAsset()` in `src/lib/api.ts`. **Playback never touches it.**

## Decision

The watermark is a **provenance and leak-tracing mechanism**. It is never described, in code or
in copy, as authorising or securing playback.

Three distinct questions, three distinct mechanisms:

| Question | Mechanism |
|---|---|
| May this person hear this now? | `audio-play` ticket + `can_user_play_path` + locked storage |
| Did a human actually listen through? | Locked transport + server clock + Spark answers |
| Where did this leaked copy come from? | Forensic watermark + provenance ledger |

## Why a watermark cannot authorise

It is embedded **inside the audio**. By the time it can be read, the bytes have already been
delivered — the access decision is long past. It is a security camera, not a lock: it tells you
where a copy came from after it escaped.

It is also silent about the session. The same marked file can be played at 20× speed by a
script, or never played at all. It identifies the **copy**, never the **listening**. Airtime
depends entirely on the latter.

## Where it does belong on The Station

The Station will carry unreleased work — that is exactly the material artists most need feedback
on — and a public synchronized broadcast is a leak surface.

**Watermark each airing**, keyed to the broadcast slot rather than the listener. If a rip
surfaces, the airing it came from is provable. One encode per airing is affordable.

This is also a promise worth making to artists: their unreleased track is marked every time it
airs, and the airing is recorded. That is a concrete reason to trust the station with a
work-in-progress rather than only finished tracks.

## Constraints to respect when that is built

**Per-listener marking does not fit a synchronized broadcast.** Everyone shares one stream at
one position; per-listener marks would mean N simultaneous encodings. The real technique is
segment-variant switching, where A/B variants of short segments combine to identify a recipient.
That is genuine engineering, not configuration. Per-airing is the pragmatic first version.

**WAV-only does not survive the streaming path.** The current implementation parses and
re-encodes WAV. Spread-spectrum marks can be designed to survive lossy encoding, but this one
must be adapted before it applies to broadcast.

**Never claim it secures playback.** Law-1 honesty applies to security claims exactly as it
applies to loudness numbers.
