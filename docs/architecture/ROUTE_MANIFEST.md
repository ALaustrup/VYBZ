# Route Manifest

## Target Suite routes

| Path | Product |
|------|---------|
| `/` | VYBZ Home |
| `/start` | Start release or project |
| `/releases` | Release list |
| `/release/:id` | Prepare workspace |
| `/studio` | Music Repos hub |
| `/studio/:id` | Repo workspace |
| `/credits` | Credit Passport |
| `/release/:id/credits` | Release credits |
| `/master` | MasterReady |
| `/release/:id/master` | Master workspace |
| `/coverlab` | CoverLab |
| `/release/:id/artwork` | Release artwork |
| `/sentinel` | Secure rooms |
| `/sentinel/:id` | Secure room |
| `/relay` | Distribution dashboard |
| `/release/:id/delivery` | Delivery |
| `/discover` | Audience discovery |
| `/live` | Live directory |
| `/live/:id` | Live session |
| `/u/:id` | Artist storefront |
| `/market` | Digital marketplace |
| `/pack/:slug` | Pack detail |
| `/messages` | Messaging |
| `/wallet` | Wallet / earnings |
| `/settings` | Account settings |

## Current routes (`src/App.tsx`) → Suite mapping

| Current | Suite fate |
|---------|------------|
| `/` (ProfilePage hub tabs) | Becomes Home; tabs redirect until shell ships |
| `/feed`, `/discover`, `/connect`, `/social` | Audience / discover; retain with redirects as needed |
| `/spark`, `/opportunities` | Demoted Connection Lab; not primary nav |
| `/projects`, `/projects/:id` | → `/studio`, `/studio/:id` |
| `/live`, `/live/:id` | Live (keep) |
| `/messages`, `/messages/:id` | Messages (keep) |
| `/rooms`, `/rooms/:id` | Live/rooms adjacency; redirect plan in Phase 1 |
| `/library` | Home / catalog adjacency |
| `/visuals/studio`, `/visuals/tutorial` | CoverLab / Artist tooling adjacency |
| `/tools/packs`, `/tools/packs/new`, `/tools/packs/:id/edit` | → `/market` family |
| `/pack/:slug` | Keep (Market) |
| `/u/:id`, `/artist/:slug`, `/p/:id` | Artist |
| `/store`, `/?tab=wallet` | Wallet / cosmetics |
| `/admin`, `/mod`, `/apply-mod` | Staff (keep) |
| `/codex`, `/legal/:slug` | Legal / Codex (keep) |
| `/enter`, landing | Marketing (unauth) |
| `/activity` → `/?tab=live` | Keep redirect |
| `/wallet` → `/?tab=wallet` | Keep until `/wallet` page |
| `/profile` | Legacy redirect |

**Rule:** no route removal without redirect. Phase 1 introduces `src/app/routeManifest.ts`.
