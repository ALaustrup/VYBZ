# Motion

> Motion laws for Suite Genesis. Presence and hierarchy — not noise.

## Laws

1. **Purposeful** — every motion clarifies state (enter, exit, success, degrade).
2. **Fast enough** — UI chrome ≤ ~200–280ms; stage presence may breathe longer.
3. **Interruptible** — respect `prefers-reduced-motion: reduce` → crossfade/opacity
   or static; no parallax compulsory loops.
4. **One focal motion** per viewport region; avoid competing pulses.
5. **Professional tools** — minimal motion (list reorder, sheet present); denser UI
   does not need hero choreography.
6. **Audience surfaces** — 2–3 intentional motions max (enter, accent, settle).
7. **Never** use motion to imply paid priority, ranking boost, or unlimited Live.

## Patterns

| Pattern | Use |
|---------|-----|
| Sheet / rail present | Suite navigation |
| Status chip settle | Prepare findings, Relay stages |
| Dock accent breathe | VDock playing (soft; reduce-motion off) |
| Stage fade | Live / Artist visual handoff |
| Degrade banner in | Hard-cap Live, provider down — calm, not alarm strobe |

## Anti-patterns

Continuous unbounded glows · emoji confetti · multi-layer shadow dances ·
autoplaying decorative video behind forms · trapping focus during long sequences.

## Implementation

Framer Motion already in stack; prefer shared variants over one-off springs.
Tokens: `--motion-fast`, `--motion-base`. Pair with [`ACCESSIBILITY.md`](./ACCESSIBILITY.md).
