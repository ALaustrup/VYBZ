# Browser Compute

> Prefer in-browser workers for free analysis before Engine or paid Edge.

## Fit for browser

| Task | Notes |
|------|-------|
| Header / peak / silence / basic spectrum | Worker; $0 |
| Readiness metadata rules | Deterministic validators |
| Artwork dimension / format checks | CoverLab precursor |
| Hash / CAS helpers for Music Repos | Pair with sync APIs |
| Lightweight waveform / peak display | Avoid main-thread stalls |

## Escalate when

- Full loudness / FFmpeg / batch → **VYBZ Engine** (`tools/vybz-bridge`)
- Watermark embed / detect → Edge `watermark*`
- Pack copy / visual stills → Edge + ProviderMode caps

## Laws

1. No unbounded loops in workers that DOS the tab.
2. Never call fal/Groq from the browser with privileged keys.
3. Show estimates before any paid escalation.
4. Deterministic checks before AI suggestions.

Cost inventory: [`../architecture/COST_INVENTORY.md`](../architecture/COST_INVENTORY.md).
