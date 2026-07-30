# ADR-026 — Desktop updater (signed Windows channel)

**Status:** Accepted (Phase 12)  
**Date:** 2026-07-30

## Context

VYBZ Desktop (Tauri 2, Windows) shipped as an unsigned alpha in Phase 5. Beta
requires a **signed MSI**, an **auto-update feed**, and a clear rollback path
before artists rely on the shell for release work.

## Decision

1. **Feed URL:** `https://update.vybz.cloud/windows/stable.json` (channel = `stable`).
2. **Artifact:** Prefer **MSI** (NSIS retained as fallback). Signed with Authenticode
   cert from GitHub secrets `WINDOWS_CERT_BASE64` + `WINDOWS_CERT_PWD`.
3. **Generator:** `scripts/build-update-feed.mjs` writes `stable.json` +
   `apps/desktop/signing/DESKTOP_INSTALLERS.json`.
4. **CI:** `.github/workflows/desktop.yml` on `windows-latest` builds, signs when
   secrets exist, uploads feed when `UPDATE_*` secrets exist, drafts a GH release
   for tags `v1.1.0-beta1A-phase12*`.
5. **Runtime:** `tauri-plugin-updater` endpoints point at the stable feed.
   Pubkey is owner-provisioned (`tauri signer generate`); placeholder in config
   until first signed channel cut.
6. **Package manager:** **npm** (not pnpm) — matches Suite Genesis doctrine.

## Rollback

| Failure | Action |
|---------|--------|
| Bad MSI on channel | Re-upload previous `stable.json` pointing at last-known-good MSI URL |
| Signature mismatch | Disable updater endpoints (empty platforms / 204) until fixed |
| Cert compromise | Revoke Authenticode cert; rotate GH secrets; cut new build |
| Feed CDN outage | Desktop continues on installed build; no forced update |

Keep prior MSI objects immutable under versioned keys on the update host.

## Consequences

- Apex / update host must be reachable (Cloudflare DNS for `update.vybz.cloud`).
- Unsigned local builds remain allowed for developers; CI marks `signed: false`.
- macOS / Linux ports deferred (Phase 17).
