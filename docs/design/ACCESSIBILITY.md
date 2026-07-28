# Accessibility

> Baseline a11y for Suite shell and products.

## Motion

- Honor `prefers-reduced-motion: reduce`: replace loops with static or simple fades.
- No essential information only in animation.
- Soft VDock / Live stage motion turns off or freezes under reduce-motion.

## Keyboard

- All primary actions reachable by keyboard; visible focus rings on abyss/graphite.
- Sheets and OverlayPortal overlays: focus trap, Escape to close, restore focus.
- VDock transport controls operable without pointer.
- Do not trap focus inside `.vdock-shell` for tall content — use OverlayPortal.

## Contrast & color

- Text/icons meet WCAG AA on abyss and graphite panels.
- Status never color-only: pair with label/icon (Prepare severity, Relay stages).
- Accent colors are wayfinding, not body copy.

## Semantics

- Landmarks for rail, main, dock; product titles as headings.
- Forms: labels, errors linked to controls; live regions for async job status.
- Media: captions/alt where art conveys meaning; decorative art empty alt.

## Safety & inclusion

- 18+ gates remain for romantic/adult Connection Lab remnants only.
- Safety features never behind paywalls.
- No anonymity; profiles are real identity surfaces.

## Related

[`MOTION.md`](./MOTION.md) · [`COLOR.md`](./COLOR.md) · [`TYPOGRAPHY.md`](./TYPOGRAPHY.md)
(Lexend / Atkinson chosen partly for readability).
