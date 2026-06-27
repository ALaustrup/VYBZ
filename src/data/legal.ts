// Public-facing legal & policy documents for MYVYB.
//
// These are operator-facing templates rendered verbatim to users. They are
// written to be clear and reasonable, but they are not legal advice.
// TODO(operator): before launch, have counsel confirm the governing-law /
// jurisdiction, the registered entity address, and the contact addresses below.

export const COMPANY = "Astra Matrix, Inc.";
export const APP_NAME = "MYVYB";
export const LAST_UPDATED = "June 16, 2026";
export const CONTACT_EMAIL = "support@getveiled.app";
export const PRIVACY_EMAIL = "privacy@getveiled.app";
export const LEGAL_EMAIL = "legal@getveiled.app";
export const GODMODE_PRICE = "$3.69";

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDoc {
  slug: string;
  title: string;
  short: string;
  description: string;
  intro: string;
  sections: LegalSection[];
}

const terms: LegalDoc = {
  slug: "terms",
  title: "Terms of Service",
  short: "Terms",
  description: "The agreement that governs your use of MYVYB.",
  intro: `These Terms of Service ("Terms") are a binding agreement between you and ${COMPANY} ("we", "us"), the operator of ${APP_NAME} (the "Service"). By creating an account or using the Service, you agree to these Terms. If you do not agree, do not use the Service.`,
  sections: [
    {
      heading: "1. Eligibility & age",
      paragraphs: [
        "You must be at least 13 years old to use the Service. By using MYVYB you represent that you are 13 or older.",
        "Sensitive (NSFW) content and adult-only spaces are gated: they are off by default and unlock only for users who verify their account and confirm they are 18 or older. You must not attempt to access adult content or 18+ circles if you are under 18.",
        "If we learn that an account belongs to someone under 13, or that someone under 18 has accessed adult content, we will take appropriate action, including termination.",
      ],
    },
    {
      heading: "2. Your account",
      paragraphs: [
        "MYVYB is anonymous by default. You are responsible for all activity that occurs under your account. You may optionally attach an email to make your account recoverable; keep your access credentials secure.",
        "You may not impersonate others, create accounts to evade a ban, or share an account in a way that violates these Terms.",
      ],
    },
    {
      heading: "3. Your content",
      paragraphs: [
        'You retain ownership of the confessions, photos, comments, and messages you submit ("Content"). By submitting Content you grant us a worldwide, non-exclusive, royalty-free license to host, store, display, and distribute that Content solely to operate and improve the Service.',
        "You represent that you own or have the rights to the Content you post and that it does not violate any law or third-party right.",
      ],
    },
    {
      heading: "4. Acceptable use",
      paragraphs: [
        "You agree to follow our Community Guidelines, which are incorporated into these Terms. In short, you may not use MYVYB to harass, threaten, exploit, or harm others, to post illegal content, or to violate anyone's rights.",
      ],
    },
    {
      heading: "5. MYVYB Plus (Godmode)",
      paragraphs: [
        `MYVYB Plus, also called "Godmode", is an optional one-time purchase of ${GODMODE_PRICE} (USD) per account that unlocks premium features. Payment is processed by our payment provider (Stripe); we do not store your card details.`,
        "ALL SALES ARE FINAL. Refunds are not provided under any circumstances. See our Refund Policy for details.",
        "Premium features may change over time. We may modify, add, or remove premium features at our discretion.",
      ],
    },
    {
      heading: "6. Moderation, suspension & termination",
      paragraphs: [
        "We may remove Content and suspend or permanently ban accounts that violate these Terms or our Community Guidelines, with or without notice, at our sole discretion.",
        "A ban may be issued for, among other things, illegal content, harassment, sexual content involving minors, threats of violence, spam, fraud, or ban evasion. Banned users are not entitled to a refund of any purchase. See our Community Guidelines for the enforcement policy.",
        "You may stop using the Service and delete your account at any time.",
      ],
    },
    {
      heading: "7. Disclaimers",
      paragraphs: [
        'The Service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, express or implied. We do not guarantee that the Service will be uninterrupted, secure, or error-free, or that any Content is accurate or appropriate.',
      ],
    },
    {
      heading: "8. Limitation of liability",
      paragraphs: [
        `To the maximum extent permitted by law, ${COMPANY} will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of data, arising from your use of the Service. Our total liability for any claim relating to the Service will not exceed the amount you paid us in the 12 months before the claim.`,
      ],
    },
    {
      heading: "9. Changes to these Terms",
      paragraphs: [
        "We may update these Terms from time to time. Material changes will be reflected by an updated date and, where appropriate, in-app notice. Continued use after changes take effect constitutes acceptance.",
      ],
    },
    {
      heading: "10. Governing law & contact",
      paragraphs: [
        "These Terms are governed by the laws of the United States and the state in which the operator is established, without regard to conflict-of-law rules.",
        `Questions about these Terms can be sent to ${LEGAL_EMAIL}.`,
      ],
    },
  ],
};

const privacy: LegalDoc = {
  slug: "privacy",
  title: "Privacy Policy",
  short: "Privacy",
  description: "What we collect, why, and your choices.",
  intro: `This Privacy Policy explains how ${COMPANY} collects, uses, and protects information when you use ${APP_NAME}. We built MYVYB to be anonymous by default and we collect as little as possible.`,
  sections: [
    {
      heading: "Information we collect",
      bullets: [
        "Account data: an anonymous account identifier and your chosen alias and aura. An email address only if you choose to add one to make your account recoverable.",
        "Content you create: confessions, photos, comments, reactions, and messages.",
        "Optional profile details: sex, age, and approximate location — only if you choose to provide them, and only shown publicly when you set your profile to public.",
        "Location: approximate, device-provided location is used only for the Local feature and only with your permission. You can revoke this in your browser/device settings.",
        "Technical data: limited data necessary to operate and secure the Service (for example, basic logs and abuse-prevention signals).",
      ],
    },
    {
      heading: "How we use information",
      bullets: [
        "To provide and operate the Service (showing confessions, enabling chat, reveals, and notifications).",
        "To keep the community safe (moderation, reports, blocking, and abuse prevention).",
        "To process purchases of MYVYB Plus through our payment provider.",
        "To maintain, debug, and improve the Service.",
      ],
    },
    {
      heading: "Payments",
      paragraphs: [
        "Purchases are handled by Stripe. We do not collect or store your full payment-card information. Stripe's handling of your payment data is governed by Stripe's own privacy policy.",
      ],
    },
    {
      heading: "Service providers",
      paragraphs: [
        "We use trusted infrastructure providers to host data and run the Service (for example, our database, storage, and hosting providers). They process data on our behalf under contractual safeguards.",
      ],
    },
    {
      heading: "Sharing",
      paragraphs: [
        "We do not sell your personal information. We may disclose information if required by law, to enforce our Terms, or to protect the rights, safety, and security of our users or the public.",
      ],
    },
    {
      heading: "Your choices & rights",
      bullets: [
        "You can edit or remove your optional profile details at any time.",
        "You can delete your account, which removes your account and associated Content from active systems.",
        "Depending on where you live, you may have rights to access, correct, or delete your personal data. To make a request, contact us.",
      ],
    },
    {
      heading: "Data retention",
      paragraphs: [
        "We keep information for as long as your account is active or as needed to operate the Service, comply with legal obligations, resolve disputes, and enforce our agreements.",
      ],
    },
    {
      heading: "Children",
      paragraphs: [
        "MYVYB is an 18+ service and is not directed to children. We do not knowingly collect data from anyone under 18.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        `For privacy questions or requests, contact ${PRIVACY_EMAIL}.`,
      ],
    },
  ],
};

const refunds: LegalDoc = {
  slug: "refunds",
  title: "Refund Policy",
  short: "Refunds",
  description: "All sales are final — no refunds.",
  intro: `This Refund Policy applies to all purchases on ${APP_NAME}, including the one-time MYVYB Plus ("Godmode") upgrade of ${GODMODE_PRICE} (USD).`,
  sections: [
    {
      heading: "All sales are final",
      paragraphs: [
        "Due to the operating costs of running the platform and the immediate, non-returnable nature of digital goods, ALL PURCHASES ARE FINAL AND NON-REFUNDABLE. Refunds will not be given under any circumstances.",
        "This includes, without limitation: accidental purchases, change of mind, dissatisfaction with premium features, lack of use, removal or modification of features, and accounts that are suspended or permanently banned for violating our Terms or Community Guidelines.",
      ],
    },
    {
      heading: "What you are buying",
      paragraphs: [
        "MYVYB Plus is a one-time, per-account purchase that unlocks premium features for that account. By completing checkout you acknowledge that you receive immediate access to digital content and that you waive any right to a refund or cancellation period to the extent permitted by law.",
      ],
    },
    {
      heading: "Chargebacks",
      paragraphs: [
        "Initiating a chargeback or payment dispute in violation of this policy may result in suspension or termination of your account. We will share transaction records with our payment provider to contest invalid disputes.",
      ],
    },
    {
      heading: "Required disclosures",
      paragraphs: [
        "Some jurisdictions provide statutory rights that cannot be waived. Nothing in this policy is intended to limit any non-waivable rights you may have under applicable law.",
        `If you believe you were charged in error, contact ${CONTACT_EMAIL}. While we do not provide refunds, we will investigate genuine billing errors.`,
      ],
    },
  ],
};

const guidelines: LegalDoc = {
  slug: "guidelines",
  title: "Community Guidelines",
  short: "Guidelines",
  description: "The rules that keep MYVYB safe, and how we enforce them.",
  intro: `MYVYB is a space for honest, anonymous expression. To keep it safe, everyone must follow these Community Guidelines. Breaking them can result in content removal, suspension, or a permanent ban.`,
  sections: [
    {
      heading: "Zero tolerance",
      bullets: [
        "Sexual content involving minors, or any content that sexualizes minors. This is reported to authorities where required by law.",
        "Threats of violence, incitement, or content promoting terrorism or mass harm.",
        "Non-consensual intimate imagery, doxxing, or sharing someone's private information.",
        "Human trafficking, exploitation, or the sale of illegal goods or services.",
      ],
    },
    {
      heading: "Not allowed",
      bullets: [
        "Harassment, bullying, hate speech, or attacks based on identity.",
        "Impersonation or pretending to be someone you are not.",
        "Spam, scams, fraud, or manipulation of votes, reveals, or rankings.",
        "Posting other people's content or identifying information without consent.",
        "Evading a ban or moderation action with new accounts.",
      ],
    },
    {
      heading: "Sensitive content",
      paragraphs: [
        "Adult or sensitive material must be marked NSFW using the post controls. Even when marked, content that violates the rules above is removed.",
      ],
    },
    {
      heading: "Reporting & blocking",
      paragraphs: [
        "Every confession can be reported and every poster can be blocked. Reports are reviewed by our team. A confession that receives multiple reports is automatically hidden pending review.",
      ],
    },
    {
      heading: "Enforcement & bans",
      bullets: [
        "Depending on severity, we may remove content, issue a warning, temporarily suspend an account, or permanently ban it.",
        "Severe or illegal violations result in an immediate permanent ban without prior warning.",
        "Banned accounts lose access to the Service and any premium features. No refund is provided for a banned account (see Refund Policy).",
        "We may report illegal content and activity to law enforcement.",
      ],
    },
    {
      heading: "If you are struggling",
      paragraphs: [
        "If you are in crisis or thinking about self-harm, please reach out for help. In the US you can call or text 988 (Suicide & Crisis Lifeline). Internationally, find a helpline at findahelpline.com. You are not alone.",
      ],
    },
  ],
};

export const LEGAL_DOCS: Record<string, LegalDoc> = {
  terms,
  privacy,
  refunds,
  guidelines,
};

// Order used for the footer / legal hub links.
export const LEGAL_ORDER = ["terms", "privacy", "refunds", "guidelines"] as const;
