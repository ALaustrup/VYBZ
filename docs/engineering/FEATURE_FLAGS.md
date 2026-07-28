# Feature Flags

Source of truth: `src/lib/flags.ts` (env `VITE_FEATURE_*`).

| Flag | Env | Default intent (Suite) |
|------|-----|------------------------|
| `roleClass` | `VITE_FEATURE_ROLE_CLASS` | On unless explicitly off |
| `tips` | `VITE_FEATURE_TIPS` | Opt-in via `on` |
| `liveBoost` | `VITE_FEATURE_LIVE_BOOST` | Opt-in |
| `oauthSpotify` | `VITE_FEATURE_OAUTH_SPOTIFY` | Opt-in |
| `swarm` | `VITE_FEATURE_SWARM` | Opt-in |
| `pro` | `VITE_FEATURE_PRO` | On unless off |
| `repos` | `VITE_FEATURE_REPOS` | On unless off — Studio |
| `socialLive` | `VITE_FEATURE_SOCIAL_LIVE` | On unless off |
| `bunnyAudio` | `VITE_FEATURE_BUNNY_AUDIO` | **Off** unless on — keep off |
| `storefront` | `VITE_FEATURE_STOREFRONT` | On unless off — Market |

## Rules

1. New Suite surfaces ship behind flags when risky.
2. Do not use flags to reintroduce Bunny as media origin.
3. Dating / Spark / VR expansions stay flagged off or absent.
4. Document flag + ProviderMode together for paid features.
5. Prod smoke after flipping flags on vybz.cloud.

See [`../operations/COST_CONTROL.md`](../operations/COST_CONTROL.md),
[`../INFRA_GATES.md`](../INFRA_GATES.md).
