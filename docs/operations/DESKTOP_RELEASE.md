# Desktop release guide (Windows beta)

**Product:** VYBZ Desktop · identifier `cloud.vybz.desktop` · version `1.1.0`  
**Suite phase:** Phase 12 Desktop Beta / Masterplan **2.D** maturation  
**Channel config:** [`apps/desktop/updater/channels.json`](../apps/desktop/updater/channels.json)  
**Feed:** `https://update.vybz.cloud/windows/stable.json`

## Build

```bash
npm run build:web
npm run build:desktop:windows   # exits 0 with guidance if Rust missing
npm run desktop:update-feed     # stable.json + DESKTOP_INSTALLERS.json
npm run smoke:desktop:installer
```

Artifacts (when built):

- MSI: `apps/desktop/src-tauri/target/release/bundle/msi/*.msi`
- NSIS: `apps/desktop/src-tauri/target/release/bundle/nsis/*.exe`

Hash table: [`apps/desktop/signing/DESKTOP_INSTALLERS.json`](../apps/desktop/signing/DESKTOP_INSTALLERS.json)

## Signing

See [`apps/desktop/signing/README.md`](../apps/desktop/signing/README.md).  
CI secrets: `WINDOWS_CERT_BASE64`, `WINDOWS_CERT_PWD`.

## Channels

| Channel | Endpoint |
|---------|----------|
| stable | `https://update.vybz.cloud/windows/stable.json` |
| preview | `https://update.vybz.cloud/windows/preview.json` |

## Multi-window

**View ▸ Waveform preview** opens `/desktop/waveform` in a second WebviewWindow.

## Secure storage

AES-GCM envelope at `%APPDATA%\Vybz\secrets.bin` (migrates Phase 5 hex store).
