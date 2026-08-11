import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, LayoutGrid, List, Search, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { BrandLockup } from "@/components/Brand";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { CODEX_DOCS, type CodexDoc } from "@/lib/codex";
import { cx } from "@/lib/utils";

type ViewMode = "list" | "cards";
const VIEW_KEY = "vybz.codex.view";

function readView(): ViewMode {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (v === "list" || v === "cards") return v;
  } catch { /* ignore */ }
  return "list";
}

export function CodexPage() {
  const [q, setQ] = useState("");
  const [view, setView] = useState<ViewMode>(readView);

  useRegisterAppBar({
    title: "Codex",
    subtitle: "Contracts, Terms & templates",
  }, []);

  function setViewMode(next: ViewMode) {
    setView(next);
    try { localStorage.setItem(VIEW_KEY, next); } catch { /* ignore */ }
  }

  const { templateGroups, policies, empty, flatTemplates } = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const match = (d: CodexDoc) =>
      !needle
      || d.title.toLowerCase().includes(needle)
      || d.summary.toLowerCase().includes(needle)
      || d.category.toLowerCase().includes(needle);
    const templates = CODEX_DOCS.filter((d) => d.kind === "template" && match(d));
    const cats = Array.from(new Set(templates.map((d) => d.category)));
    const pol = CODEX_DOCS.filter((d) => d.kind === "policy" && match(d));
    return {
      templateGroups: cats.map((c) => ({ category: c, docs: templates.filter((d) => d.category === c) })),
      policies: pol,
      flatTemplates: templates,
      empty: templates.length === 0 && pol.length === 0,
    };
  }, [q]);

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-5 pb-10 pt-4">
      <div className="mx-auto max-w-3xl">
        <BrandLockup height="h-6" reactive className="mb-3 opacity-90" />
        <p className="mb-4 text-sm text-white/45">
          Free music-industry documents from <span className="text-white/70">Astra Matrix, Inc.</span> — starting points for collaborations.
        </p>
        <div className="mb-5 h-px w-full bg-[var(--hairline)]" />

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <label className="flex min-w-[12rem] flex-1 items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 focus-within:border-veil-400/60">
            <Search className="h-4 w-4 text-white/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents…" className="w-full bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none" />
          </label>
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1" role="group" aria-label="Codex view">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              aria-pressed={view === "list"}
              aria-label="List view"
              className={cx("rounded-lg p-2", view === "list" ? "bg-white/12 text-white" : "text-white/45")}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              aria-pressed={view === "cards"}
              aria-label="Cards view"
              className={cx("rounded-lg p-2", view === "cards" ? "bg-white/12 text-white" : "text-white/45")}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {empty ? (
          <EmptyState
            icon={Search}
            title="No documents match"
            body={q.trim() ? `Nothing found for “${q.trim()}”. Try a broader term.` : "Codex is empty."}
          />
        ) : view === "cards" ? (
          <>
            {flatTemplates.length > 0 && (
              <section className="mb-6">
                <p className="eyebrow mb-3">Templates</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {flatTemplates.map((d) => (
                    <DocCard key={d.slug} doc={d} to={`/codex/${d.slug}`} />
                  ))}
                </div>
              </section>
            )}
            {policies.length > 0 && (
              <section className="mb-6">
                <p className="eyebrow mb-3 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Policies</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {policies.map((d) => (
                    <DocCard key={d.slug} doc={d} to={`/legal/${d.slug}`} />
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <>
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
          </>
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
    <Link to={to} className="flex items-start gap-3 py-3.5 transition hover:bg-white/[0.02]">
      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-white/35" />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-white/90">{doc.title}</span>
        <span className="mt-0.5 block text-[12px] text-white/40">{doc.summary}</span>
      </span>
    </Link>
  );
}

function DocCard({ doc, to }: { doc: CodexDoc; to: string }) {
  return (
    <Link to={to} className="forge-card block transition hover:border-white/20">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">{doc.category}</p>
      <p className="mt-1 text-sm font-semibold text-white">{doc.title}</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-white/45">{doc.summary}</p>
    </Link>
  );
}
