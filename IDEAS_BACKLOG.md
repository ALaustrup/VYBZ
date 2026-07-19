# VYBZ — Ideas Backlog (save points between phases)

> **Purpose.** A low-friction place to capture the owner's ideas *as they happen*
> without detouring the active development plan. Ideas land here for analysis;
> when one is ready, it graduates into a sequenced phase in `VYBZ_MASTERPLAN.md`.
>
> **Ritual.** At each phase boundary (before starting the next phase) the agent
> asks: *"Any new ideas to bank before we continue?"* New ideas are appended
> below with a short analysis (fit / dependencies / guardrails / rough shape).
> Nothing here is committed to build until it's promoted into the masterplan.
>
> **Legend:** 🟢 ready to plan · 🟡 needs infra/keys · 🔴 needs research/decision.

---

## Idea log

### 2026-07-19 — "Live & Video" cluster
Five related ideas, captured together. They split cleanly across three buckets:
things that reuse what we have (do soon), things gated on infra/cost, and one
Trust & Safety must-have.

#### 1. Private 1:1 cam-to-cam in chat 🟡
- **What:** optional, high-quality, private video call between two connected
  creators inside DMs.
- **Fit:** extends the shipped **H1 live 1:1 audio** WebRTC path (§K) — add a
  camera `MediaStream` (video track) to the existing peer connection + local/
  remote video tiles. Signaling + connection model already exist.
- **Security/privacy:** WebRTC is P2P and encrypted (DTLS-SRTP) — no server sees
  the stream. Identity-first: both sides are real, connected creators; both must
  explicitly opt in to go live; no recording by default.
- **Dependency:** **TURN** server for NAT traversal reliability (already on the
  infra-gated backlog, §4.1). Works on good networks without it; unreliable on
  strict NAT until TURN exists.
- **Guardrails:** consent-to-connect, in-call "end/report", camera off by default.
- **Rough shape:** moderate FE work on top of existing WebRTC; unblock fully with TURN.

#### 2. Live Streams feed — "minimalist Twitch, built in" 🟡🔴
- **What:** creators broadcast what they're working on to the world (or a filtered
  audience); its own high-quality feed + a home in the dashboard.
- **Fit:** audience filtering maps to our existing **professions / role-class**
  axes + audience-restricted visibility (already in `feed_posts`). A `/live` tab
  slots beside the feed.
- **Hard part (decision needed 🔴):** 1-to-many does **not** work over P2P. Two
  viable paths:
  - **A) Bunny Stream live ingest → HLS** (RTMP/SRT in, adaptive HLS out). Cheapest,
    aligns with our existing Bunny.net media strategy; needs confirmation Bunny
    supports live ingest on our plan (VOD is confirmed; live must be verified).
  - **B) LiveKit SFU** (already infra-gated on our backlog) — lower latency, more
    infra + cost.
- **Monetization:** live tips via **Stripe Connect** (Lane A) — on-mission (tips,
  never paywalls/ads). Per-creator, disclosed.
- **Guardrails:** identity-first broadcasters; audience scoping in stream settings;
  report affordance on every stream (see #5); no anonymous viewers.
- **Rough shape:** largest item; gated on the A-vs-B decision + infra/cost.

#### 3. Full 8K video upload support 🟡
- **What:** ensure very-high-res video uploads are fully supported end-to-end.
- **Fit:** we already **stream** large uploads (≤1 GB) via `bunny-upload`. 8K
  masters are multi-GB, so: raise the cap, move to **resumable/chunked** upload
  (Bunny TUS), and transcode to **adaptive HLS via Bunny Stream** for playable
  delivery (raw 8K is unplayable for most viewers).
- **Dependency:** Bunny Stream library (already noted as gated in §4.1).
- **Guardrails:** per-uploader storage awareness (cost); format/size validation.

#### 4. Uploader-managed content library (all media) 🟢
- **What:** original uploader can manage everything they've uploaded.
- **Fit:** the **Uploads/Library dashboard** (Phase 3) already does this for drops
  (rename / feature / delete). Generalize it to video + all content kinds — mostly
  an extension, not new infra.
- **Rough shape:** small–moderate; do alongside #3's video work.

#### 5. Universal one-tap "report illegal content" flag 🟢 ⚑ (safety priority)
- **What:** a simple, optional flag/report button on **every** piece of uploaded
  content (drops, project posts, video, streams).
- **Fit:** the **reporting + staff/moderation backbone already exists**
  (`ReportModal`, reports, mod/staff system §12.5). This is mostly surfacing the
  affordance consistently everywhere + a fast path for "illegal content."
- **Why prioritize:** legal / DMCA / Trust & Safety obligation (see masterplan
  Legal §). Low effort, high protection — strong candidate to pull forward as a
  small standalone item rather than waiting on the full Live cluster.
- **Rough shape:** small; can ship independently and early.

**Suggested grouping when promoted:**
- Pull **#5** forward as a small, independent T&S item (not infra-gated).
- Bundle **#3 + #4** into a "Video pipeline" phase once a Bunny Stream library exists.
- Treat **#1 + #2** as a "Live" phase, unblocked by TURN (#1) and the Bunny-live /
  LiveKit decision (#2).

---

_No promotions yet — all of the above are captured for analysis only._
