> **HISTORICAL ONLY — NOT AUTHORITATIVE — DO NOT USE FOR CURRENT IMPLEMENTATION OR SEQUENCING.**
>
> Superseded on 2026-08-01 by the five authorities: `VYBZ_MASTERPLAN.md`, `AGENTS.md`,
> `ARCHITECTURE.md`, `STATUS.md`, `IDEAS_BACKLOG.md`. Retained as a historical record only.

# Phase 15 Exit Gate — Remote Processing v2 (AI Mastering & Metadata AI)

**Branch:** `phase15-remote-ai`  
**Date:** 2026-07-30  
**Base:** `main` @ `v1.1.0-beta1A-phase14`  
**Authority:** Owner Phase 15 Remote AI Processing prompt

> **Name collision:** Historical docs `PHASE15_EXIT_GATE.md` /
> `PHASE15_PLATFORM_INVENTORY.md` refer to **Phase 1.5** platform readiness.
> This file is **Suite Genesis Phase 15** (Remote AI). Prefer this path for
> Beta-1A exit evidence.

## Adaptations vs prompt

| Prompt | Repo truth |
|--------|------------|
| `ai-mastering.ts` / `ai-metadata.ts` | Edge dirs `supabase/functions/ai-mastering/` + `ai-metadata/` (`index.ts`) |
| ONNX &lt;20 MB on Edge Worker | DSP path shipped (`phase15.dsp.1`); ONNX file optional at `ai-models/mastering.onnx` — detected, not required for gate |
| `input.duration > 10 MB` | Byte size `> PORTABLE_FFT_MAX_BYTES` (10 MB) |
| Mutation queue progress | In-memory AI job store + `Progress` (same UX pattern as upload queue) |
| Exit doc name | This file (avoids clobbering Phase 1.5) |

## Checklist

| Gate | Status | Evidence |
|------|--------|----------|
| Schema `0087` jobs + results + RLS | **Pass** | migration + `.down.sql` |
| Edge `ai-mastering` + `ai-metadata` | **Pass** | functions + registry |
| Bridge remote route &gt;10 MB | **Pass** | `src/platform/bridge/web.ts` |
| Cost hooks + free-tier kill-switch | **Pass** | `aiMastering.cost.test.ts` |
| `/release/:id/master` UI | **Pass** | `ReleaseMasterPane` + e2e fixture |
| Unit ≥ 115 · e2e ≥ 19 · golden ≤ 0.1/0.3 dB | **Pass** | see Validation |
| CI `ai-test` | **Pass** | `.github/workflows/ci.yml` |
| Docs / ADR-029 | **Pass** | this file + `ADR_AI_MASTERING.md` |
| Unpushed until owner approval | **Pass** | |

## Validation

```text
npm run lint               ✓
npm run test               ✓ 119 tests (≥ 115)
npm run build              ✓
npm run test:e2e           ✓ 19 passed (≥ 19)
npm run ai:test            ✓ golden RMS ≤ 0.3 dB
npm run perf:audit         ✓ ≥ 90
```

## Deliverables

| Stream | Location |
|--------|----------|
| Migration | `supabase/migrations/20260730_0087_processing_ai.sql` |
| Mastering DSP | `packages/processing/mastering/` |
| Metadata | `packages/processing/metadata/` |
| Edge | `supabase/functions/ai-mastering/` · `ai-metadata/` |
| UI | `src/features/mastering/ReleaseMasterPane.tsx` |
| ADR | [`ADR_AI_MASTERING.md`](./ADR_AI_MASTERING.md) |

## Owner ops (parallel)

| Action | When | Notes |
|--------|------|-------|
| Apply migration `0087` | before smoke | Supabase project `xixmneooyufbeftdfpcm` |
| Upload ONNX (optional) | before ONNX path | `ai-models/mastering.onnx` (&lt;20 MB) |
| Deploy `ai-mastering`, `ai-metadata` | after migrate | JWT **on** |
| Verify Groq/FAL quota | anytime | metadata uses `GROQ_API_KEY` |

## Next

Await owner approval → push → PR **Phase 15 – Remote AI Processing** → merge →
tag `v1.1.0-beta1A-phase15`.
