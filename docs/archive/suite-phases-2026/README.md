> **HISTORICAL ONLY — NOT AUTHORITATIVE — DO NOT USE FOR CURRENT IMPLEMENTATION OR SEQUENCING.**

# Suite phase records (2026)

Exit gates and inventories from the retired Phase 1 – Phase 19 sequence, plus the staged
workspace-extraction plan. Archived 2026-08-01 when phase numbering was retired in favour
of a later milestone system. `VYBZ_MASTERPLAN.md` is archived and is not current law.

**These documents describe what was built, not what to build.** Several of them describe
work as "complete" that a user could never reach; see
[`PRODUCTION_REALITY_AUDIT_2026-07-31.md`](../../architecture/PRODUCTION_REALITY_AUDIT_2026-07-31.md).

## Why they were kept

Each carries operational detail recorded nowhere else — migration numbers, secret names,
release-channel URLs, CI matrix decisions and tolerance values. Examples: `PHASE12` holds
the Windows update feed URL and certificate secret names; `PHASE13` the Android AAB path
correction and KeyStore preferences; `PHASE18` the `ai-topup` deploy ordering; `PHASE19`
the iOS certificate table and AASA `TEAMID` requirement.

## Naming collision

`PHASE15_EXIT_GATE.md` is **Phase 1.5 (platform readiness)**.
`PHASE15_REMOTE_AI_EXIT_GATE.md` is **Phase 15 (remote AI processing)**. They are unrelated.

## Corresponding tags

Nineteen `v1.1.0-beta1A-phase*` tags remain in the repository as immutable history and must
not be deleted.
