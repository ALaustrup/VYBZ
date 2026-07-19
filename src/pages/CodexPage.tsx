import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Search, ShieldCheck } from "lucide-react";
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
    <div className="no-scrollbar h-full overflow-y-auto px-5 pb-10 pt-4">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-[1.65rem] font-semibold tracking-tight text-white">Codex</h1>
        <p className="mt-1 mb-4 text-sm text-white/45">
          Free music-industry documents from <span className="text-white/70">Astra Matrix, Inc.</span> — starting points for collaborations.
        </p>
        <div className="mb-5 h-px w-full bg-[var(--hairline)]" />

        <label className="mb-6 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 focus-within:border-veil-400/60">
          <Search className="h-4 w-4 text-white/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents…" className="w-full bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none" />
        </label>

        {templateGroups.map((g) => (
          <section key={g.category} className="mb-6">
            <p className="eyebrow mb-3">{g.category}</p>
            <div className="divide-y divide-[var(--hairline)]">
              {g.docs.map((d) => <DocRow key={d.slug} doc={d} to={`/codex/${d.slug}`} />)}
            </div>
          </section>
        ))}

        {policies.length > 0 && (
          <section className="mb-6">
            <p className="eyebrow mb-3 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> {policies[0].category}</p>
            <div className="divide-y divide-[var(--hairline)]">
              {policies.map((d) => <DocRow key={d.slug} doc={d} to={`/legal/${d.slug}`} />)}
            </div>
          </section>
        )}

        <p className="mt-2 text-[11px] leading-snug text-white/35">
          Codex templates are informational, not legal advice, and do not create an attorney–client relationship. Laws vary by jurisdiction — consult a qualified attorney before relying on any document.
        </p>
      </div>
    </div>
  );
}

function DocRow({ doc, to }: { doc: CodexDoc; to: string }) {
  return (
    <Link to={to} className="flex items-start gap-3 py-3.5 transition hover:bg-white/[0.02] active:scale-[0.995]">
      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-white/30" />
      <span className="min-w-0">
        <span className="block font-display text-sm font-semibold text-white">{doc.title}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-white/45">{doc.summary}</span>
        <span className="mt-1 block text-[10px] uppercase tracking-wider text-white/30">{doc.jurisdiction} · v{doc.version}</span>
      </span>
    </Link>
  );
}
