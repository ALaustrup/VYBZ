# Platform Overview

VYBZ is a single-root SPA backed by one Supabase project. Suite products share
identity, storage, billing, jobs, and audit. Audience surfaces (Artist, VDock,
Live, Market) sit on the same kernel as professional tools (Prepare, Credits,
MasterReady, CoverLab, Sentinel, Relay, Studio).

```text
[ Suite Shell ]
     │
     ├── features/* (Home … Market)
     │
[ Platform kernel ]
     │
     ├── Supabase Auth / DB / Storage / Realtime / Edge
     ├── Stripe · Resend · LiveKit · Groq · fal (gated)
     └── VYBZ Engine (local Bridge) ←→ browser workers
```

**Laws:** no second app rewrite; Storage-only media; paid providers reserved;
deterministic checks before AI. See root [`ARCHITECTURE.md`](../ARCHITECTURE.md).
