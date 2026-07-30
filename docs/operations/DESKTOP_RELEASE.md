# Desktop release guide (Windows · macOS · Linux)

**Product:** VYBZ Desktop · identifier `cloud.vybz.desktop` · version `1.1.0`  
**Suite phase:** Phase 17 cross-platform / Masterplan **2.D**  
**Channel config:** [`apps/desktop/updater/channels.json`](../../apps/desktop/updater/channels.json)

## Feeds (per OS)

| OS | Stable feed |
|----|-------------|
| Windows | `https://update.vybz.cloud/windows/stable.json` |
| macOS | `https://update.vybz.cloud/darwin/stable.json` |
| Linux | `https://update.vybz.cloud/linux/stable.json` |

## Build

```bash
npm run build:web
npm run build:desktop:windows   # MSI/NSIS (Windows host or exits 0 with guidance)
npm run build:desktop:macos     # DMG (macOS / CI)
npm run build:desktop:linux     # AppImage (Linux / CI)
npm run desktop:update-feed     # per-OS stable.json + DESKTOP_INSTALLERS.json
npm run smoke:desktop:installer # requires dmg + appimage sha256 entries
```

### Artifacts

| Platform | Path |
|----------|------|
| Windows MSI | `apps/desktop/src-tauri/target/release/bundle/msi/*.msi` |
| Windows NSIS | `apps/desktop/src-tauri/target/release/bundle/nsis/*.exe` |
| macOS DMG | `apps/desktop/src-tauri/target/release/bundle/dmg/*.dmg` |
| Linux AppImage | `apps/desktop/src-tauri/target/release/bundle/appimage/*.AppImage` |

Hash table: [`apps/desktop/signing/DESKTOP_INSTALLERS.json`](../../apps/desktop/signing/DESKTOP_INSTALLERS.json)

## Signing / notarisation

| OS | Secrets | Notes |
|----|---------|-------|
| Windows | `WINDOWS_CERT_BASE64`, `WINDOWS_CERT_PWD` | Authenticode via signtool |
| macOS | `MAC_CERT_BASE64`, `MAC_CERT_PWD` (+ `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`) | Developer ID + notarisation |
| Linux | — | AppImage; optional later GPG |

See [`apps/desktop/signing/README.md`](../../apps/desktop/signing/README.md).

## CI

`.github/workflows/desktop.yml` jobs: `windows-msi` · `mac-dmg` · `linux-appimage`.

## Multi-window

**View ▸ Waveform preview** opens `/desktop/waveform` in a second WebviewWindow.

## Secure storage

AES-GCM envelope (Windows: `%APPDATA%\Vybz\secrets.bin`; macOS/Linux: app data dir).
