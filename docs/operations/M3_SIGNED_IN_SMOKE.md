# M3 signed-in production smoke (owner)

> Reference checklist for Masterplan M3 exit gate. Agent/automation cannot complete this
> without owner credentials. Record pass/fail and date in `STATUS.md`.

**Target:** https://vybz.cloud  
**Build SHA check:** landing footer `data-testid="build-sha"` must match `git rev-parse --short HEAD` on `main`.

---

## 1. Landing & auth

| Step | Action | Expected |
|---|---|---|
| 1.1 | Open `/` unsigned | Nexus landing loads; footer shows current build SHA |
| 1.2 | Click **Sign in** | Auth shell loads (Nexus styling, no dating gate) |
| 1.3 | Sign in with your account | Redirect into signed-in hub/shell |

## 2. Navigation (Orb menu)

Open the orb menu and confirm each item loads a **working** surface (not placeholder):

| Nav item | Path | Expected |
|---|---|---|
| Home | `/` | Dash hub / profile shell |
| Releases | `/releases` | Prepare releases list (`prepare-releases`) |
| Studio | `/studio` | Studio projects surface |
| Discover | `/discover` | Discover feed |
| Live | `/live` | Live sessions |
| Library | `/library` | Saved/bought library |
| Messages | `/messages` | Messages inbox |
| AI minutes | `/settings/credits` | Credits balance UI |
| Usage | `/settings/costs` | Cost Sentinel / usage |

## 3. Prepare → Distribution (truth)

| Step | Action | Expected |
|---|---|---|
| 3.1 | `/releases` → **New release** | Upload tiles; auto-scan when track + cover ready |
| 3.2 | Open release detail | Readiness score visible; tap **View full breakdown** for findings |
| 3.3 | Expand breakdown | Each finding shows measured detail + how to fix |
| 3.3 | Open **Distribution** | `distribution-page` visible |
| 3.4 | Check loudness row | Shows **Not measured** or measured value — **not** a fabricated default LUFS |
| 3.5 | Export ZIP (optional) | Download succeeds; SHA shown if implemented |

## 4. Processing enqueue (backend)

| Step | Action | Expected |
|---|---|---|
| 4.1 | From a release, enqueue analysis/processing job | Request succeeds (authenticated) |
| 4.2 | Inspect job state in UI or Supabase | State is **`queued`** — not auto-`completed` stub |

## 5. Profile & modals

| Step | Action | Expected |
|---|---|---|
| 5.1 | Profile → tabs (You / Listen / Connect) | Nexus styling, no legacy `glass-panel` |
| 5.2 | Open report/tip/composer modals if available | Nexus overlay chrome |

---

## Sign-off

When all rows pass, update `STATUS.md`:

- Set **Authenticated experience end-to-end on production** to **PASS** with date.
- Declare M3 delivery state per Masterplan §12 (owner decision — do not write "complete").

If any row fails, file the route + screenshot in `STATUS.md` blockers and do **not** sign off M3.
