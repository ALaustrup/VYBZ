# ADR-031 — Desktop macOS & Linux ports (Phase 17)

**Status:** Accepted  
**Date:** 2026-07-30  
**Branch:** `phase17-desktop-cross`

## Context

Phase 12 shipped a signed Windows MSI + `windows/stable.json` updater feed.
Artists on macOS and Linux need equivalent installers and update channels without
forking the product core (glass UI / tokens v2 stay shared via the web frontend).

## Decision

1. **Bundles:** Tauri 2 targets `msi` + `nsis` (Windows), `dmg` (macOS),
   `appimage` (Linux) from one `apps/desktop` scaffold.
2. **Per-OS feeds:**  
   - `https://update.vybz.cloud/windows/stable.json`  
   - `https://update.vybz.cloud/darwin/stable.json`  
   - `https://update.vybz.cloud/linux/stable.json`  
   Generator: `scripts/build-update-feed.mjs` (+ `--fixtures` for local gate).
3. **CI matrix** in `.github/workflows/desktop.yml`: `windows-msi`, `mac-dmg`,
   `linux-appimage` (plus draft release on `v1.1.0-beta1A-phase17*` tags).
4. **macOS notarisation:** GitHub secrets `MAC_CERT_BASE64` + `MAC_CERT_PWD`
   (mapped to Tauri `APPLE_CERTIFICATE` / `APPLE_CERTIFICATE_PASSWORD`), plus
   optional `APPLE_ID` / `APPLE_PASSWORD` / `APPLE_TEAM_ID` for notarisation.
   Unsigned DMG still produced when secrets are absent (CI smoke).
5. **Hash table:** `apps/desktop/signing/DESKTOP_INSTALLERS.json` records
   per-platform `sha256` (real artifacts on CI; fixtures for dmg/appimage locally).

## Non-goals

- Mac App Store / Snap / Flatpak store listings
- Universal mac binary packaging in v1 (single DMG keyed as aarch64 + x86_64 share)
- Changing Suite glass tokens or web chrome

## Consequences

- Update CDN must host three `stable.json` paths.
- Owner must provision Apple Developer ID + notarisation secrets before signed
  macOS channel goes live.
- Windows Phase 12 clients remain compatible (`{{target}}/stable.json`).
