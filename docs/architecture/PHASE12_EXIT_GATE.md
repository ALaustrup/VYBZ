# Phase 12 Exit Gate — Desktop Beta (Windows updater + signed channel)

**Branch:** `phase12-desktop-beta`  
**Date:** 2026-07-30  
**Base:** `main` @ `v1.1.0-beta1A-phase11` (+ WAF go-live docs)  
**Authority:** Owner Phase 12 Desktop Beta prompt

## Adaptations vs prompt

| Prompt | Repo truth |
|--------|------------|
| `pnpm tauri build` | **npm** + `npx tauri build` |
| `scripts/build-update-feed.ts` | `scripts/build-update-feed.mjs` (same contract) |
| Feed host | `https://update.vybz.cloud/windows/stable.json` |

## Checklist

| Gate | Status | Evidence |
|------|--------|----------|
| Updater in `tauri.conf.json` (stable) | **Pass** | `plugins.updater.endpoints` → stable.json |
| Update feed script | **Pass** | `npm run desktop:update-feed` |
| CI `desktop.yml` MSI + sign + feed | **Pass** | `.github/workflows/desktop.yml` |
| WaveformPreview multi-window + menu | **Pass** | Rust `vybz_open_waveform_preview` + `/desktop/waveform` |
| AES-GCM `secrets.bin` + migration | **Pass** | `secure_store.rs` + `src/platform/desktop/securePreferences.ts` |
| Installer hash table | **Pass** | `DESKTOP_INSTALLERS.json` via smoke / feed script |
| Update ping 204 contract | **Pass** | unit + `e2e/desktop-beta.spec.ts` |
| Lint · unit ≥ 90 · build · e2e ≥ 11 | **Pass** | see Validation |
| Perf-audit ≥ 90 | **Pass** | existing Phase 11 shells |
| Docs / ADR | **Pass** | this file + ADR-026 |
| Unpushed until owner approval | **Pass** | |

## Validation

```text
npm run lint               ✓
npm run test               ✓ 93 tests
npm run build              ✓
npm run test:e2e           ✓ 13 passed
npm run perf:audit         ✓ ≥99 on gated shells
npm run desktop:update-feed ✓ stable.json stub
npm run smoke:desktop:installer ✓ (toolchain_missing until Rust MSI on CI)
```

## Deliverables

| Stream | Location |
|--------|----------|
| Tauri config | `apps/desktop/src-tauri/tauri.conf.json` |
| Channels | `apps/desktop/updater/channels.json` |
| Feed script | `scripts/build-update-feed.mjs` |
| CI | `.github/workflows/desktop.yml` |
| Waveform UI | `src/pages/WaveformPreviewPage.tsx` |
| Secure prefs | `apps/desktop/src-tauri/src/secure_store.rs` · `src/platform/desktop/securePreferences.ts` |
| ADR | [`ADR_DESKTOP_UPDATER.md`](./ADR_DESKTOP_UPDATER.md) |

## Owner secrets (prod channel)

- `WINDOWS_CERT_BASE64` / `WINDOWS_CERT_PWD`
- Tauri updater pubkey (replace placeholder in `tauri.conf.json`)
- `UPDATE_BUCKET_WRITE_TOKEN` + `UPDATE_FEED_UPLOAD_URL` (optional upload)

## Next

Await owner approval → push → PR **Phase 12 – Desktop Beta** → merge →
tag `v1.1.0-beta1A-phase12` → CHANGELOG.
