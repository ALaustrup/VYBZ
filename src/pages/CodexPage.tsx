import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Search, ScrollText, ShieldCheck } from "lucide-react";
import { CODEX_DOCS, type CodexDoc } from "@/lib/codex";

export function CodexPage() {
  const [q, setQ] = useState("");

  const { templateGroups, policies } = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const match = (d: CodexDoc) => !needle || d.title.toLowerCase().includes(needle) || d.summary.toLowerCase().includes(needle) || d.category.toLowerCase().includes(needle);
    const templates = CODEX_DOCS.filter((d) => d.kind === "template" && match(d));
    const cats = Array.from(new Set(templates.map((d) => d.category)));
    return {
      templateGroups: cats.map((c) => ({ category: c, docs: templates.filter((d) => d.category === c) })),
      policies: CODEX_DOCS.filter((d) => d.kind === "policy" && match(d)),
    };
  }, [q]);

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-10 pt-3">
      <div className="mx-auto max-w-2xl">
        <div className="mb-1 flex items-center gap-2">
          <ScrollText className="h-6 w-6 text-veil-300" />
          <h1 className="font-display text-2xl font-bold text-gradient">VYBZ Codex</h1>
        </div>
        <p className="mb-4 text-sm text-white/60">Free, professionally-drafted music-industry documents and templates — provided by <span className="font-semibold text-white/80">Astra Matrix, Inc.</span> Use them as starting points for your career and collaborations.</p>

        <label className="mb-5 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 focus-within:border-veil-400/60">
          <Search className="h-4 w-4 text-white/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents…" className="w-full bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none" />
        </label>

        {templateGroups.map((g) => (
          <section key={g.category} className="mb-6">
            <p className="mb-2 text-[11px] uppercase tracking-wider text-white/40">{g.category}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {g.docs.map((d) => <DocCard key={d.slug} doc={d} to={`/codex/${d.slug}`} />)}
            </div>
          </section>
        ))}

        {policies.length > 0 && (
          <section className="mb-6">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/40"><ShieldCheck className="h-3.5 w-3.5 text-feel" /> {policies[0].category}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {policies.map((d) => <DocCard key={d.slug} doc={d} to={`/legal/${d.slug}`} />)}
            </div>
          </section>
        )}

        <p className="mt-2 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-3 text-[11px] leading-snug text-white/45">
          Codex templates are general informational documents, not legal advice, and do not create an attorney–client relationship. Laws vary by jurisdiction — consult a qualified attorney before relying on any document. The catalog expands over time.
        </p>
      </div>
    </div>
  );
}

function DocCard({ doc, to }: { doc: CodexDoc; to: string }) {
  return (
    <Link to={to} className="flex items-start gap-2.5 rounded-2xl border border-white/8 bg-white/[0.03] p-3.5 transition active:scale-[0.99] hover:border-white/15">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-veil-500/15 text-veil-100"><FileText className="h-4 w-4" /></span>
      <span className="min-w-0">
        <span className="block font-display text-sm font-semibold text-white">{doc.title}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-white/50">{doc.summary}</span>
        <span className="mt-1 block text-[10px] uppercase tracking-wide text-white/35">{doc.jurisdiction} · v{doc.version}</span>
      </span>
    </Link>
  );
}
