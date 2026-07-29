# Desktop release guide (Windows alpha)

**Product:** VYBZ Desktop · identifier `cloud.vybz.desktop` · version `1.1.0`  
**Suite phase:** Phase 5 / Masterplan **2.D** (Windows alpha)  
**Channel config:** [`apps/desktop/updater/channels.json`](../apps/desktop/updater/channels.json)

## Build

```bash
npm run build:web
npm run build:desktop:windows   # exits 0 with guidance if Rust missing
npm run smoke:desktop:installer # records SHA-256 stub or real NSIS hash
```

Artifact path (when built):

`apps/desktop/src-tauri/target/release/bundle/nsis/*.exe`

Hash table: [`apps/desktop/signing/INSTALLER_HASHES.json`](../apps/desktop/signing/INSTALLER_HASHES.json) (generated; may be absent until first smoke).

## Install modes

| Mode | Config |
|------|--------|
| GUI / per-user + per-machine | `bundle.windows.nsis.installMode: both` |
| Passive updater install | Documented for when `tauri-plugin-updater` is enabled |

## Signing

See [`apps/desktop/signing/README.md`](../apps/desktop/signing/README.md). Unsigned builds are expected until Authenticode + updater pubkey are provisioned. **Never commit certs or private keys.**

## Channels

| Channel | Endpoint (planned) |
|---------|-------------------|
| preview | `https://releases.vybz.cloud/desktop/preview` |
| stable | `https://releases.vybz.cloud/desktop/stable` |

Runtime updater remains **disabled** until signed manifests exist.

## Desktop Engine surfaces

| Surface | Path |
|---------|------|
| Batch loudness / waveform | `/desktop/process` |
| Native analyze | Tauri `vybz_analyze_audio` |
| Window prefs | `vybz_window_prefs_*` |
| Secure session | `vybz_secure_*` (app-data sealed store) |
| Crash log | `%APPDATA%/cloud.vybz.desktop/logs/crash.log` (opt-in Sentry send OFF) |

## AV / SmartScreen

Unsigned NSIS may trigger SmartScreen. Prefer signed builds for alpha cohort distribution.
