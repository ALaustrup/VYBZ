# Desktop code signing (Windows)

Phase 5 records the **installer hash workflow**. Certificates are owner-held and
never committed.

## Modes

| Mode | When | Behavior |
|------|------|----------|
| Unsigned NSIS | No Authenticode cert | `tauri build` produces `.exe`; record SHA-256 in [`DESKTOP_RELEASE.md`](../../../docs/operations/DESKTOP_RELEASE.md) |
| Signed NSIS | Cert + `TAURI_SIGNING_*` / Windows signtool | Same artifact + signature; update hash table |
| Updater | Pubkey in `tauri.conf.json` + signed update manifests | Enable `tauri-plugin-updater` after first signed channel cut |

## Silent / GUI install

NSIS `installMode: both` in `tauri.conf.json` allows per-user GUI and passive
updater installs (`plugins.updater.windows.installMode: passive`).

## Do not commit

- `.pfx` / `.p12` / private keys
- `TAURI_PRIVATE_KEY` material
- Sentry DSNs with send enabled by default
