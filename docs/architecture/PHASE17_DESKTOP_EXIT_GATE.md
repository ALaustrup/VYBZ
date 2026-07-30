# Phase 17 Exit Gate — Desktop macOS & Linux Ports

**Branch:** `phase17-desktop-cross`  
**Date:** 2026-07-30  
**Base:** `main` @ `v1.1.0-beta1A-phase16`  
**Authority:** Owner Phase 17 Desktop macOS & Linux Ports prompt

## Checklist

| Gate | Status | Evidence |
|------|--------|----------|
| Tauri targets dmg + appimage (+ win) | **Pass** | `tauri.conf.json` |
| Per-OS `stable.json` channels | **Pass** | `updater/channels.json` + feed script |
| CI `windows-msi` · `mac-dmg` · `linux-appimage` | **Pass** | `.github/workflows/desktop.yml` |
| Notarisation wiring (`MAC_CERT_*`) | **Pass** | mac-dmg job imports cert → Tauri env |
| DESKTOP_INSTALLERS dmg + appimage hashes | **Pass** | `npm run smoke:desktop:installer` |
| No UI chrome rewrite | **Pass** | shared `dist/` frontend |
| Unit ≥ 127 · e2e web ≥ 21 · perf ≥ 90 | **Pass** | see Validation |
| Docs / ADR-031 | **Pass** | this file + `ADR_DESKTOP_CROSS.md` |
| Unpushed until owner approval | **Pass** | |

## Validation

```text
npm run lint                    ✓
npm run test                    ✓ 128 tests (≥ 127)
npm run build                   ✓
npm run test:e2e                ✓ 22 passed (≥ 21)
npm run desktop:update-feed     ✓ per-OS stable.json
npm run smoke:desktop:installer ✓ dmg + appimage sha256 present
npm run perf:audit              ✓ ≥ 90
```

## Deliverables

| Stream | Location |
|--------|----------|
| Tauri config | `apps/desktop/src-tauri/tauri.conf.json` |
| Channels | `apps/desktop/updater/channels.json` |
| Feed / hashes | `scripts/build-update-feed.mjs` · `DESKTOP_INSTALLERS.json` |
| CI | `.github/workflows/desktop.yml` |
| ADR | [`ADR_DESKTOP_CROSS.md`](./ADR_DESKTOP_CROSS.md) |

## Owner ops (parallel)

| Action | When | Notes |
|--------|------|-------|
| Set `MAC_CERT_BASE64` / `MAC_CERT_PWD` | before signed mac channel | Apple Developer ID `.p12` |
| Optional `APPLE_ID` / `APPLE_PASSWORD` / `APPLE_TEAM_ID` | notarisation | App-specific password |
| Publish feeds to CDN | after CI artifacts | `darwin/` + `linux/` + `windows/` |
| Keep `WINDOWS_CERT_*` | ongoing | unchanged from Phase 12 |

## Next

Await owner approval → push → PR **Phase 17 – Desktop macOS & Linux Ports** →
merge → tag `v1.1.0-beta1A-phase17`.
