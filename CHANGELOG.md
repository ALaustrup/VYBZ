# Changelog

All notable platform releases are documented here. Product labels follow
[`VERSIONING.md`](./VERSIONING.md).

## Beta-0A — 2026-07-24

First Beta baseline. Closes the Alpha era.

### Taskbar & chrome
- Unified full-bleed bottom dock (no desktop side rail); player strip lives inside taskbar glass.
- Pins evenly spaced in a `1fr | orb | 1fr` layout; bar reaches screen edges on all viewports.

### Orb
- Idle: slow neochrome plasma sphere.
- Playing: eases into uploader morph / palette; on playback end, soft return to idle sphere.
- Larger draw surface + silhouette caps so Max intensity no longer clips.

### Stability / display
- Soft / VYBZ Max reactive intensity prefs; session boot failsafe; DEV service-worker unregister.

## Alpha (historical)

Everything prior to tag `Beta-0A` / commit baseline on `main` through
`fa861ff` and earlier — including the MYVYB → VYBZ pivot, passkeys, Spaces /
Studio, matchmaking, Stripe Connect tips, weekly digest, New Drop editor, and
Orb-first reactivity — is **Alpha**. No further Alpha labels will be cut.
