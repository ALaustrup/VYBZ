# Desktop code signing (Windows · macOS · Linux)

Certificates are owner-held and **never committed**.

## Modes

| Mode | Secrets | Behavior |
|------|---------|----------|
| Windows unsigned | — | MSI/NSIS for CI smoke; `signed: false` in hash table |
| Windows Authenticode | `WINDOWS_CERT_BASE64`, `WINDOWS_CERT_PWD` | signtool after `tauri build` |
| macOS unsigned | — | DMG smoke artifact |
| macOS Developer ID + notarisation | `MAC_CERT_BASE64`, `MAC_CERT_PWD`, optional `APPLE_ID` / `APPLE_PASSWORD` / `APPLE_TEAM_ID` | Import `.p12` → Tauri `APPLE_CERTIFICATE*` |
| Linux AppImage | — | Unsigned AppImage (Phase 17) |
| Updater | Tauri pubkey in `tauri.conf.json` | Per-OS `stable.json` under `update.vybz.cloud/{windows,darwin,linux}/` |

## Hash table

`DESKTOP_INSTALLERS.json` is multi-platform (`platforms.windows-x86_64`,
`darwin-aarch64`, `linux-x86_64`, …). Local gate uses `--fixtures` for dmg/appimage
when Rust bundles are absent; CI overwrites with real artifacts.

## Do not commit

- `.pfx` / `.p12` / private keys
- `TAURI_PRIVATE_KEY` / updater private material
- Raw `MAC_CERT_*` / `WINDOWS_CERT_*` values
