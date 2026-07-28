# VYBZ Credits (Vc) Whitepaper

**Version 1.2 · Astra Matrix, Inc. · July 28, 2026**

---

## 1. Summary

**VYBZ Credits (Vc)** are the closed-loop social currency of the VYBZ Music Hub. They power tips to indie artists (`~username`), listen-to-earn, and cosmetics (Flair). Cosmetics / Profile Enhancement are the **primary** optional revenue; tips are **secondary**. Vc is also the **precursor unit** for a future exchange-listed digital asset.

| Parameter | Value |
|-----------|--------|
| Unit name | VYBZ Credits |
| Symbol (platform) | **Vc** |
| Peg (reference) | **1 Vc = $0.05 USD** |
| Starter grant | **20 Vc** (= $1.00 at peg) |
| Wallet address | **`~username`** (e.g. `~Andrew`) |
| Future ticker | **VYBZ** |
| Target listing window | **2027** |
| Cash-out today | **None** (closed-loop) |

This document is product and technical disclosure — not an offer to sell securities or tokens.

---

## 2. What Vc is (today)

1. **Internal balance** stored on each member profile and mutated only by server-side, audited procedures.
2. **Append-only ledger** (`vc_tx_ledger`) recording every mint, earn, transfer, top-up, and spend — a transaction registrar analogous to how major networks keep an ordered history of movements.
3. **Peer-to-peer send/receive** between VYBZ users addressed as **`~username`** (leading `~` or `@` are stripped on send).
4. **Listen-to-earn & feedback-to-earn** — meaningful listens and real track feedback award fragments under daily caps.
5. **Spend inside VYBZ** — tip live streamers, P2P gifts, cosmetics (Flair), and other closed marketplace uses.

Vc is **not** redeemable for USD, bank transfers, or on-chain assets in this generation of the product.

---

## 3. Peg and economics

The platform hardcodes a **reference peg** of **$0.05 USD per Vc** for display, starter grants, and top-up pack sizing. Example: a $5 pack targets **100 Vc**.

The peg is a **product reference rate** for closed-loop credits. It does not imply convertibility, reserves, or guaranteed redemption.

---

## 4. Ledger & security

- Balances change only inside **security-definer** database functions with row locks.
- Every material movement should appear in **`vc_tx_ledger`** with amount, parties, kind, memo, and optional idempotency key (prevents double-grants).
- Clients never write balances directly.
- Abuse controls include minimum transfer size, maximum transfer size, banned-user checks, anti-self listen/feedback, and daily earn caps.

This is the **network fabric** for Vc: accurate, auditable, and ready to inform a future tokenized representation.

---

## 5. Earning Vc (gamification)

Members earn fragments for authentic music engagement and social participation, for example:

- **Meaningful listen** to another member’s upload (≥30s or ≥50% of the track) — `listen_together`
- **Star rating** on another member’s track — `track_feedback` (higher than a quick reaction)
- **Written feedback note** (8–280 characters, spam-gated) — `track_feedback_note`
- Daily presence / login
- Accepting connections and high-quality matches
- Messages (rate-limited), cam / video presence, Live, reactions

Taste matchmaking ranks **who** you meet from shared listens and ratings; earn rewards **how** you engage. Amounts and caps are server-enforced and may evolve.

---

## 6. Spending Vc

Primary in-app spends:

- **Tip live streamers** — send Vc to the host’s `~username` address from Live
- **Direct transfer** — Wallet send to any `~username`
- Cosmetics (Flair) and other closed marketplace uses

Core connection (DM, matching) remains free. Pegged packs remain optional top-ups.

---

## 7. Roadmap — VYBZ (VYBZ) in 2027

Subject to law, licensing, and corporate decisions, Astra Matrix intends to introduce an exchange-supported digital asset branded **VYBZ** with ticker **VYBZ**, informed by the Vc ledger and economy. Until then:

- Platform balances remain **closed-loop credits**.
- No promise of listing, conversion ratio, or airdrop is made by this whitepaper.
- Communications will update members if and when a conversion or listing program is approved.

---

## 8. Risks & disclaimers

- Vc has **no cash value** for withdrawal today.
- Peg is illustrative for UX and packs — not a promise of market price.
- Future token plans may change or be abandoned.
- Do not treat Vc as an investment contract.

For Terms and Privacy, see `/legal/terms` and `/legal/privacy`.

---

## 9. Contact

Astra Matrix, Inc. · VYBZ platform · [vybz.cloud](https://vybz.cloud)
