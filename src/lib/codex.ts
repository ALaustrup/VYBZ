// VYBZ Codex — catalog of free, professionally-drafted music-industry documents
// (templates) and Astra Matrix's own platform legal policies. Bodies are markdown
// files served statically from /codex and /legal; this module is the index.

export type DocKind = "template" | "policy";

export interface CodexDoc {
  slug: string;
  kind: DocKind;
  category: string;
  title: string;
  summary: string;
  jurisdiction: string;
  version: string;
  path: string;
}

export const CODEX_DOCS: CodexDoc[] = [
  // ── Templates ──────────────────────────────────────────────────────────────
  { slug: "split-sheet", kind: "template", category: "Songwriting & Publishing", title: "Songwriter Split Sheet", summary: "Records who wrote a song and each writer's ownership percentage. Execute at creation.", jurisdiction: "US-first · adapt to your territory", version: "1.0", path: "/codex/split-sheet.md" },
  { slug: "producer-agreement", kind: "template", category: "Production", title: "Producer Agreement", summary: "Master ownership, producer fee/points, publishing, and credit for a production.", jurisdiction: "US-first · adapt to your territory", version: "1.0", path: "/codex/producer-agreement.md" },
  { slug: "beat-license-nonexclusive", kind: "template", category: "Production", title: "Non-Exclusive Beat License", summary: "Licenses a beat within set usage caps while the producer keeps ownership.", jurisdiction: "US-first · adapt to your territory", version: "1.0", path: "/codex/beat-license-nonexclusive.md" },
  { slug: "featured-artist-agreement", kind: "template", category: "Collaboration & Features", title: "Featured Artist Agreement", summary: "Guest feature's master split, credit, approvals, and compensation.", jurisdiction: "US-first · adapt to your territory", version: "1.0", path: "/codex/featured-artist-agreement.md" },
  { slug: "collaboration-agreement", kind: "template", category: "Collaboration & Features", title: "Collaboration Agreement", summary: "Ground rules for co-creators: ownership, income, decisions, credit, departure.", jurisdiction: "US-first · adapt to your territory", version: "1.0", path: "/codex/collaboration-agreement.md" },
  { slug: "work-for-hire", kind: "template", category: "Collaboration & Features", title: "Work-for-Hire Agreement", summary: "Flat-fee engagement (session, vocals, engineering, art) with ownership assigned to the hirer.", jurisdiction: "US-first · adapt to your territory", version: "1.0", path: "/codex/work-for-hire.md" },
  { slug: "nda-mutual", kind: "template", category: "Protection & Confidentiality", title: "Mutual Non-Disclosure Agreement", summary: "Protects confidential info both sides share while exploring a project.", jurisdiction: "US-first · adapt to your territory", version: "1.0", path: "/codex/nda-mutual.md" },
  { slug: "cease-and-desist", kind: "template", category: "Protection & Confidentiality", title: "Cease & Desist Letter", summary: "Formally demands another party stop infringing your work, name, or artwork.", jurisdiction: "US-first · adapt to your territory", version: "1.0", path: "/codex/cease-and-desist.md" },

  // ── Platform legal (Astra Matrix, Inc.) ─────────────────────────────────────
  { slug: "terms", kind: "policy", category: "Platform Legal · Astra Matrix, Inc.", title: "Terms of Service", summary: "The binding agreement governing use of VYBZ.", jurisdiction: "Astra Matrix, Inc.", version: "1.0", path: "/legal/terms.md" },
  { slug: "privacy", kind: "policy", category: "Platform Legal · Astra Matrix, Inc.", title: "Privacy Policy", summary: "What we collect, how we use and share it, and your rights.", jurisdiction: "Astra Matrix, Inc.", version: "1.0", path: "/legal/privacy.md" },
  { slug: "dmca", kind: "policy", category: "Platform Legal · Astra Matrix, Inc.", title: "Copyright & DMCA Policy", summary: "How to report infringement and how we respond (notice & takedown).", jurisdiction: "Astra Matrix, Inc.", version: "1.0", path: "/legal/dmca.md" },
  { slug: "acceptable-use", kind: "policy", category: "Platform Legal · Astra Matrix, Inc.", title: "Acceptable Use Policy", summary: "Conduct rules for the platform.", jurisdiction: "Astra Matrix, Inc.", version: "1.0", path: "/legal/acceptable-use.md" },
];

export function docBySlug(slug: string): CodexDoc | undefined {
  return CODEX_DOCS.find((d) => d.slug === slug);
}

export async function fetchDocMarkdown(path: string): Promise<string> {
  const r = await fetch(path);
  if (!r.ok) throw new Error("Document not found");
  return r.text();
}
