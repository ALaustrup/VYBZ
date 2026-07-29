# ADR: Processing Engine (portable · native · remote)

| Field | Value |
|-------|--------|
| Status | **Accepted** |
| Date | 2026-07-28 |
| Phase | 4 — Processing Engine |

## Context

Prepare / MasterReady need deterministic audio analysis (waveform, loudness,
spectrum) without silent paid spend. Three engines: portable workers, desktop
native (Tauri), remote job skeleton.

## Decision

1. **Portable** — `@vybz/processing/waveform` + Web Worker FFT for WAV ≤10 MB.
2. **Native** — Tauri command `vybz_analyze_audio` (high-res peaks + batch loudness) via Platform Bridge.
3. **Remote** — `processing_jobs` table + Edge `processing-enqueue` skeleton (no paid AI).
4. **Cost Sentinel** — local job-minutes + storage tracking; alerts log-only (no network).

Routing preference: portable → native → remote stub. Paid providers remain disabled until reservation.

## Consequences

- Migration: `20260728_0083_processing_jobs.sql` (+ down)
- Bridge `analyzeAudio` returns inline `result` for portable/native
- Golden-file unit tests lock deterministic sine WAV metrics
- Job lifecycle contract tests in `src/platform/jobs/lifecycle.ts`

## Non-goals

Certified BS.1770 meter · FFmpeg transcode · paid remote AI · MasterReady UI polish
