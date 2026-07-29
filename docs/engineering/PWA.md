# PWA

VYBZ ships as a Vite PWA. Service worker must **not** permanently pin stale `index.html`
after deploys to vybz.cloud.

## Rules

1. Precache hashed `/assets/*`; network-first or bypass for document navigations.
2. After release, hard-refresh / “update available” path must load new shell.
3. Do not cache authenticated API responses with long TTL.
4. Offline: graceful degrade for catalog chrome; do not fake paid job success offline.
5. Icons / manifest stay brand-aligned; no dating/Spark chrome.

## Verify (release)

- [ ] Deploy → open vybz.cloud → confirm new build hash
- [ ] SW updates without requiring manual cache clear for typical users
- [ ] VDock still plays CDN media after SW update
- [ ] CSP still intact with SW (`vercel.json`)

Companion: [`PERFORMANCE.md`](./PERFORMANCE.md), [`../PRODUCTION_HARDENING.md`](../PRODUCTION_HARDENING.md).
