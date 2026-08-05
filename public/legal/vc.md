# VYBZ Credits (Vc) Whitepaper

**Version 2.0 · Astra Matrix, Inc. · August 5, 2026**

> **What changed in 2.0.** Every reference to a future exchange-listed token, a
> ticker, and a target listing window has been removed. Vc is a closed-loop utility
> credit and nothing else. Version 1.2 described a possible 2027 digital asset; that
> language is withdrawn and is not replaced. Vc adds a hosting entitlement (VYBZ Pro)
> as a spend category.

---

## 1. Summary

**VYBZ Credits (Vc)** are the closed-loop utility credit of VYBZ. They pay for things
inside the product: the VYBZ Pro hosting entitlement, cosmetics, and optional support
sent to other members.

| Parameter | Value |
|---|---|
| Unit name | VYBZ Credits |
| Symbol | **Vc** |
| Reference price | **1 Vc = $0.05 USD** |
| Starter grant | **20 Vc** (= $1.00) |
| Wallet address | **`~username`** (e.g. `~Andrew`) |
| Cash-out | **None.** Vc cannot be withdrawn or converted to money |
| Tradeable | **No.** Vc is not transferable off VYBZ and has no market |

Vc is **not** an investment, a security, a token, or a cryptocurrency. There is no
exchange listing, no ticker, and no plan for either. Buying Vc is buying credit toward
VYBZ features, in the same way a prepaid balance works in a game store.

---

## 2. What Vc is

1. **An internal balance** on your profile, changed only by audited server-side procedures.
2. **An append-only ledger** (`vc_tx_ledger`) recording every grant, earn, transfer, purchase and spend, with amount, parties, kind, memo and an idempotency key that prevents double charges.
3. **Peer-to-peer transfer** between members addressed as **`~username`**.
4. **Earned in fragments** for genuine engagement, under daily caps.
5. **Spent inside VYBZ only.**

Clients never write balances. Every movement is server-authored and recorded.

---

## 3. Reference price

VYBZ uses a fixed internal reference of **$0.05 per Vc** to size credit packs and to
display approximate value. A $5 pack is 100 Vc.

This is a fixed product price, not a market rate. It does not imply convertibility,
reserves, or redemption. Vc does not fluctuate in value and is not traded anywhere.

---

## 4. Earning Vc

Members earn fragments for authentic engagement, for example a meaningful listen to
another member's upload, a star rating, a written feedback note, daily presence,
accepting a connection, going live. Amounts and daily caps are enforced by the server
and may change.

Earning is a courtesy, not compensation, and carries no cash value.

---

## 5. Spending Vc

| Spend | What it buys |
|---|---|
| **VYBZ Pro** | 60 Vc per 30 days — hosting your audio on VYBZ, publishing to discovery, and selling through your storefront |
| **Pro overage** | 6 Vc per GB per period above the 10 GB included allowance |
| **Cosmetics (Flair)** | Profile appearance only. Never affects ranking, reach or matching |
| **Support a member** | Optional transfer to another member's `~username` |

### What Vc never gates

Analysis, readiness scanning, mastering, correction, translation previews,
distribution reports, export packages, managing and downloading your own files,
messaging, live, and browsing discovery are **free and always will be**. They run on
your own device or on infrastructure already paid for, so there is nothing to charge
for.

Pro exists because storing and serving audio costs real money. Nothing else does.

---

## 6. VYBZ Pro terms

- **Price:** 60 Vc for 30 days, plus disclosed overage above 10 GB.
- **Renewal is manual.** Nothing auto-charges. There is no recurring subscription.
- **Renewing early extends your period** rather than replacing it. You never lose paid time.
- **Grace period:** when a period ends, published tracks stay public for a further 30 days, with warning.
- **After grace:** published tracks become **private**. They are **not deleted**. They remain in your library and you can download them at any time.
- **Your audio is never deleted for non-payment.** This is a commitment, not a courtesy.

---

## 7. Ledger and safeguards

- Balances change only inside security-definer database functions holding row locks.
- Every material movement appears in `vc_tx_ledger`.
- Idempotency keys prevent duplicate grants and duplicate charges.
- Abuse controls include minimum and maximum transfer sizes, banned-account checks, anti-self-award rules, and daily earn caps.

---

## 8. Risks and disclaimers

- Vc has **no cash value** and cannot be withdrawn.
- Vc is **not** a security, token, cryptocurrency, or investment contract. Do not treat it as one.
- The $0.05 reference is a product price, not a market price.
- Features that Vc buys may change. Prices may change with notice.
- Unused Vc is not refundable except where consumer law requires it.

For Terms and Privacy, see `/legal/terms` and `/legal/privacy`.

---

## 9. Contact

Astra Matrix, Inc. · VYBZ · [vybz.cloud](https://vybz.cloud)
