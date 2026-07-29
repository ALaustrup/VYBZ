# Audio Processing

## Pipeline preference

```text
Browser analysis → VYBZ Engine (FFmpeg / loudness / batch) → Edge watermark → paid mastering (manual_approval)
```

## Anchors

| Concern | Location |
|---------|----------|
| Playback | AudioBus, VDock |
| Repos / CAS | `src/lib/repoSync.ts`, migrations `0059`/`0060` |
| Local companion | `tools/vybz-bridge` → Engine |
| Provenance | `watermark` / `watermark-detect` |
| Live | LiveKit via `livekit-token` |

## Rules

1. Masters and private stems stay in private Storage — not public CDN.
2. Do not market forensic or mastering capability beyond demonstrated behavior.
3. Managed mastering vendors require `manual_approval` and reservation.
4. Vc is not a substitute for clear dollar pricing on pro processing.
5. Bunny audio flag stays off; no Bunny media origin.

See [`BROWSER_COMPUTE.md`](./BROWSER_COMPUTE.md), [`../architecture/VYBZ_ENGINE.md`](../architecture/VYBZ_ENGINE.md).
