# ADR-029 — AI Mastering & Metadata AI (Phase 15)

**Status:** Accepted  
**Date:** 2026-07-30  
**Branch:** `phase15-remote-ai`

## Context

Suite Genesis needs remote-capable mastering and metadata suggestions without
reopening paid minute billing (Phase 16). Portable FFT already caps at 10 MB;
larger masters need a remote engine path that still respects Cost Sentinel.

## Decision

1. **DSP-first mastering** (`phase15.dsp.1`) — loudness normalize to ≈−14 dBFS
   RMS, peak ceiling 0.95, optional stereo width. Deterministic TypeScript in
   `@vybz/processing/mastering`, mirrored in Edge Function `ai-mastering`.
2. **ONNX optional** — owner may upload `ai-models/mastering.onnx` (&lt;20 MB) to
   Supabase Storage. Edge detects presence and records `onnxAvailable`; runtime
   inference is deferred until weights + ORT are validated. No new secrets.
3. **Metadata AI** — Edge `ai-metadata` prefers Groq (`GROQ_API_KEY`); local /
   e2e use fixture + heuristic (`phase15.metadata.1`). Suggestions only — never
   auto-approve rights (ADR-009).
4. **Jobs / results** — `processing_jobs_ai` + `processing_results.proc_version`
   (migration `0087`). RLS owner-only.
5. **Bridge** — `analyzeAudio` routes to remote-tagged path when
   `sizeBytes > PORTABLE_FFT_MAX_BYTES` (10 MB). Prompt said “duration”; repo
   truth is byte size (same gate as Phase 4).
6. **Cost** — `recordCost('ai_mastering', seconds, usd)` with free-tier
   **300 s/month**; kill-switch `feature:ai_mastering:disabled`. Soft telemetry
   only — no Stripe minute billing.

## Consequences

- Golden RMS tests + CI `ai-test` gate remaster drift ≤ 0.3 dB.
- UI `/release/:id/master` ships Analyze & Master, progress, A/B, download.
- Phase 16 may attach paid minute billing to the same cost feature keys.

## Non-goals

- Real-time collaborative mastering preview.
- Paid minute billing / Stripe processing webhooks.
