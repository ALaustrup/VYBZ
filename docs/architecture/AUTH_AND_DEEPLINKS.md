# Authentication and deep links (multi-client)

> Skeleton for Phase 1.5 implementation. Authority: Master Blueprint §7.

## Identity

- **Authoritative:** Supabase Auth on project `xixmneooyufbeftdfpcm`
- Same account across VYBZ Cloud, Desktop, and Android
- Entitlements: server-side only

## Session storage

| Client | Approach |
|--------|----------|
| Cloud | Existing browser Supabase session persistence |
| Desktop | Encrypted native secret store (Tauri plugin) via Platform Bridge `auth.*` |
| Android | Secure Android-backed storage via Platform Bridge `auth.*` |

No service_role or provider secrets in any client.

## Deep-link / callback surface

Must handle: OAuth, magic link, password recovery, email verification, invitation
acceptance, open Release Project, open Finding, open Processing Job.

Prefer HTTPS app links on `vybz.cloud` (and verified Android App Links). Custom
schemes only where required. Uninstalled / wrong-device → web fallback.

## Phase 1.5 deliverable

Route handler skeleton + platform registration docs; full verification in 2.A / 2.D.
