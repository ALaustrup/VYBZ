# VDock

> Authoritative product brief. Accent: **shared brand cyan**. Persistent player.

## Purpose

Persistent playback, queue, credits glance, and support entry across the Suite.
Not a modal viewport — overlays leave the dock shell via OverlayPortal.

## Customer

Anyone listening on VYBZ: artists previewing, fans on Artist pages, Live adjacent
playback when applicable.

## Jobs

- Play / pause / seek / queue across routes
- Show now-playing, credits entry, tip / support CTAs
- Host visual stage without trapping tall UI inside the dock
- Respect AudioBus as the single audio authority

## Data sketch

Client playback state · track metadata from catalog / release assets · tips ledger
adjacency · visual manifest (`vdockVisualManifest`) · no separate media origin
(Storage CDN only).

## Cost behavior

Free. Cosmetics / visuals may use prepaid paths elsewhere; VDock itself does not
spin paid providers on open.

## Copy one-liner

**Always listening. Never in the way.**

## Design accent

Shared cyan (`--vdock-accent`). Compact chrome; motion for presence, not noise.

## OverlayPortal rule (hard)

Tips, comments, source pickers, expanded player **must** render via
`OverlayPortal` on `document.body`, above dock z-70, with bottom clearance for
`--dock-reserve`. **Never** nest tall sheets inside `.vdock-shell`.

## DoD

- [ ] Persistent dock for signed-in sessions
- [ ] OverlayPortal compliance on all dock overlays
- [ ] Queue + now-playing across Suite routes
- [ ] Reduced-motion and keyboard operable controls
