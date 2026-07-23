# VYBZ Privacy Policy

**Controller:** Astra Matrix, Inc. (“Astra Matrix,” “we,” “us,” or “our”)  
**Service:** VYBZ — https://vybz.cloud (and related apps, sites, and APIs)  
**Effective Date:** July 23, 2026 **Version:** 2.0

This Privacy Policy explains what personal information Astra Matrix collects through VYBZ, how we use and share it, and your rights. By creating an account or using the Service, you agree to this Policy. If you do not agree, do not use the Service.

VYBZ is an **identity-first** music collaboration network. Accounts represent real creators; we do not offer anonymous or disposable accounts.

---

## 1. Information We Collect

### 1.1 Account & authentication
- Email address and authentication credentials (including passkeys / WebAuthn credentials and password hashes where used), managed by our authentication provider.
- Chosen username / display name and account identifiers.

### 1.2 Profile & professional information
Information you provide for discovery and matchmaking, such as: bio, avatar, location, roles you offer and seek, genres, DAWs/plugins, influences, skill/experience signals, work preferences (e.g. open-to-work, remote-ok), profession / role-class labels, and per-facet privacy settings you control.

### 1.3 User content
Audio and related files you upload (drops, stems, samples, project files, versions), images, project posts, messages (direct messages and room/project chat), credits and split-sheet data, live-session metadata, bug reports, moderation reports, and similar content and metadata you create or submit.

### 1.4 Payments & tips (Stripe)
When you tip another creator, enable tips / payouts, or purchase optional cosmetics or other paid features:
- We receive limited payment-related information needed to operate tips and purchases (for example: tip amount, currency, status, Stripe session / payment identifiers, optional tip message, and which users are sender and recipient).
- **Payment card numbers and full bank account details are collected and processed by Stripe, Inc. and its affiliates (“Stripe”), not by Astra Matrix.** We do not store your full card number on our servers.
- If you enable creator payouts, Stripe Collects identity and business verification information (KYC) through Stripe-hosted onboarding for a **Stripe Connect Express** connected account linked to your VYBZ profile. Stripe processes that information under [Stripe’s Privacy Policy](https://stripe.com/privacy).

When you provide personal data in connection with payments or payouts on VYBZ, **Stripe receives that personal data and processes it in accordance with [Stripe’s Privacy Policy](https://stripe.com/privacy).**

### 1.5 Usage, matchmaking & interaction data
Plays, reactions (“feel” / “wild”), ratings, connects/passes, Spark actions, applications/pitches, downloads, search/filter usage, match scores and explainability signals (including role complementarity, genre/DAW overlap, reputation, freshness, and optional taste / co-reaction signals), notification events, and feature-flag / product analytics needed to operate and improve the Service.

### 1.6 Device, network & technical data
IP address, browser and device type, approximate location derived from IP where applicable, diagnostic logs, crash/error reports, and security signals. For real-time audio features (e.g. 1:1 jam / WebRTC), temporary connection metadata and ICE/TURN routing may be processed to establish encrypted peer sessions.

### 1.7 Cookies & local storage
Sign-in sessions, preference flags (e.g. visual-effects settings, soft UI dismissals), and similar client storage required for the Service to function. See Section 8.

### 1.8 Information from third-party connections (optional)
If you connect optional integrations (for example Spotify for Artists OAuth when enabled), we receive the account identifiers and profile fields those providers return under their terms and your authorization.

### 1.9 Information we do not collect as a core product
We do not require government ID numbers to create a VYBZ account. Identity verification for **payouts** is handled by Stripe during Connect onboarding when you choose to receive tips.

---

## 2. How We Use Information

We use personal information to:
1. **Provide the Service** — accounts, profiles, feed, Network matchmaking, Studio collabs, rooms, messaging, live listening / jam sessions, Codex documents, and related features.
2. **Operate payments** — creator tips via Stripe Connect (destination charges to your connected account), optional cosmetic purchases, ledgers, receipts, fraud prevention, and payout readiness.
3. **Protect creators & media** — download gating, forensic watermarking where applicable, provenance / ledger events, C2PA Content Credentials when enabled, spam and abuse prevention, and moderation.
4. **Personalize & improve** — ranking and fairness in matches and feeds, learning-to-rank from outcomes you generate (connect/pass/accept/decline), product quality, and debugging.
5. **Communicate** — transactional messages (security, tips status, collab activity), optional digests or product updates when enabled, and support responses.
6. **Comply with law** — legal process, tax/accounting where applicable, and enforcement of our Terms, Acceptable Use, and Copyright policies.

We do **not** use personal information to sell ads against your private content, and we do **not** gate core collaboration features behind paywalls.

---

## 3. Legal Bases (GDPR / UK GDPR)

Where those laws apply, we process personal information on the bases of:
- **Contract** — to provide the Service and features you request (including tips and payouts).
- **Legitimate interests** — to secure and improve the Service, prevent fraud/abuse, and protect creators’ works, balanced against your rights.
- **Consent** — where required (e.g. optional marketing, certain cookies, optional Swarm seeding, optional OAuth links).
- **Legal obligation** — where the law requires retention or disclosure.

---

## 4. How We Share Information

### 4.1 Service providers (processors)
We use vetted providers that process data on our behalf under contract, including (as configured for VYBZ):
- **Supabase** — authentication, database, realtime, and Edge Functions.
- **Vercel** — application hosting and edge delivery.
- **Bunny.net** — media storage and CDN (including token-authenticated secure zones for protected originals).
- **Resend** — transactional email / SMTP when provisioned.
- **Stripe** — payments, tips, Connect onboarding/KYC, payouts, and related fraud tooling ([Stripe Privacy Policy](https://stripe.com/privacy)).
- Infrastructure used for live audio reliability when enabled (e.g. TURN / SFU providers).

### 4.2 Other users of VYBZ
Public profile fields, public drops, verified credits, and interactions you take publicly are visible to other users as inherent to a collaboration network. Direct messages and private Studio rooms are limited to participants (and to staff only as needed for safety/legal review).

### 4.3 Stripe & payment counterparties
- Tip **senders** and **recipients** see tip-related status necessary to complete the transaction.
- Stripe processes payment and connected-account data as an independent controller/processor under its own policy for Connect services. See [Stripe’s Privacy Policy](https://stripe.com/privacy) and Stripe’s Connected Account Agreement presented during onboarding.

### 4.4 Legal, safety & business transfers
We may disclose information where required by law, to enforce our terms, or to protect rights, safety, and security. In a merger, acquisition, or asset sale, personal information may transfer subject to this Policy or a successor policy with notice.

### 4.5 What we do not do
We do **not** sell your personal information. We do **not** share it for cross-context behavioral advertising as “sharing” under CPRA in the manner of selling lists to advertisers. Optional disclosed **affiliate / referral** merchant links you choose to post are your responsibility to label; they do not change match scores.

---

## 5. Profile Privacy Controls

Certain profile facets can be marked private. Private facets may still be used **server-side** to improve *your* match results (via secured RPCs) without exposing raw private values to other users. Public projections (e.g. username, avatar, roles labels you leave public) remain visible as described above.

---

## 6. Data Retention

We retain personal information while your account is active and as needed to provide the Service, resolve disputes, prevent abuse, and meet legal, tax, and accounting obligations (including tip and purchase records). When you delete content or your account, we delete or de-identify associated data within a reasonable period, except backups, security logs, and records we must retain. Stripe retains payment and KYC records according to Stripe’s policies and applicable law.

---

## 7. Security

We use administrative, technical, and organizational measures appropriate to the risk, including encrypted transport (HTTPS), Row-Level Security on our database, least-privilege service roles for Edge Functions, and token-authenticated access to protected media. Real-time audio uses encrypted WebRTC (DTLS-SRTP) between peers when available. No method of transmission or storage is completely secure; we cannot guarantee absolute security.

Report security concerns to **privacy@astramatrix.xyz** (or your designated security contact). Please do not publicly disclose vulnerabilities that could put creators or media at risk before we can remediate.

---

## 8. Cookies & Local Storage

We use cookies and local storage that are necessary for authentication sessions and to remember preferences (for example visual-effects intensity, soft UI dismissals, and feature flags cached client-side). We do not use third-party advertising cookies as part of the core VYBZ product. You can control cookies through your browser; some features may not work without them.

---

## 9. Your Rights

Depending on your location, you may have rights to **access, correct, delete, port, or restrict** processing of your personal information, and to **object** to certain processing or **withdraw consent**.

**California (CCPA/CPRA):** You have rights to know, delete, correct, and to opt out of “sale” / “sharing.” **We do not sell personal information.** To exercise rights, email **privacy@astramatrix.xyz**. We will verify requests as required by law and will not discriminate against you for exercising privacy rights.

**EEA/UK:** You may lodge a complaint with your local supervisory authority.

Payment-specific requests that only Stripe can fulfill (e.g. card data held solely by Stripe) should also be directed to Stripe via mechanisms described in [Stripe’s Privacy Policy](https://stripe.com/privacy).

---

## 10. International Transfers

Your information may be processed in the United States and other countries where we or our providers operate. Where required, we use appropriate safeguards (such as standard contractual clauses) for cross-border transfers.

---

## 11. Children

VYBZ is not directed to children and is intended for users **18+** (or the age of majority in your jurisdiction). We do not knowingly collect personal information from children. If you believe a child has provided information, contact **privacy@astramatrix.xyz** and we will take appropriate steps.

---

## 12. Optional Features & Planned Processing

Some features may be off by default or infra-gated. When enabled, they process data as follows:
- **Tips / Connect** — as described in Sections 1.4 and 4.3.
- **Cosmetic store** — purchase records via Stripe; cosmetics are optional and do not gate collaboration.
- **Weekly best-fits digest** — email summarizing match suggestions when email delivery is provisioned.
- **Audio embeddings (“sounds like this”)** — derived audio features from drops you upload, used to improve sonic match signals.
- **Swarm (P2P seeding)** — only if you opt in; encrypted chunk distribution with CDN fallback.
- **LiveKit / group rehearsal / Bunny Stream** — session and media metadata for group live features when those services are turned on.

Enabling a feature constitutes additional processing under this Policy for that feature’s purpose.

---

## 13. Changes

We may update this Policy. Material changes will be notice through the Service or by email, and the Effective Date / Version above will be updated. Continued use after the effective date of changes constitutes acceptance where permitted by law.

---

## 14. Contact

**Astra Matrix, Inc.**  
Privacy inquiries: **privacy@astramatrix.xyz**  
Service: https://vybz.cloud  
Related policies: [Terms of Service](/legal/terms.md) · [Acceptable Use](/legal/acceptable-use.md) · [Copyright & DMCA](/legal/dmca.md)  
Stripe’s privacy practices: https://stripe.com/privacy

---

*Astra Matrix, Inc. provides this Policy for VYBZ users and for platform disclosures required by payment partners (including Stripe Connect). It should be reviewed by qualified counsel for your jurisdictions. Company mailing address may be provided on request via privacy@astramatrix.xyz while corporate records are finalized.*
