import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Printer, Loader2, FileWarning, Info } from "lucide-react";
import { docBySlug, fetchDocMarkdown } from "@/lib/codex";

export function CodexDocPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const doc = docBySlug(slug);
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!doc) { setLoading(false); setError(true); return; }
    setLoading(true); setError(false);
    document.title = `${doc.title} · VYBZ Codex`;
    (async () => {
      try {
        const [{ marked }, md] = await Promise.all([import("marked"), fetchDocMarkdown(doc.path)]);
        if (!alive) return;
        setHtml(marked.parse(md, { async: false }) as string);
        setLoading(false);
      } catch {
        if (alive) { setError(true); setLoading(false); }
      }
    })();
    return () => {
      alive = false;
      document.title = "VYBZ";
    };
  }, [doc]);

  function print() {
    // Open a clean window so the app-wide print-block (content protection) doesn't apply.
    const w = window.open("", "_blank", "width=820,height=900");
    if (!w) return;
    const title = doc?.title ?? "VYBZ Codex";
    const meta = doc
      ? `${doc.jurisdiction} · v${doc.version} · Astra Matrix, Inc.`
      : "Astra Matrix, Inc.";
    w.document.write(`<!doctype html><html><head><title>${title} · VYBZ Codex</title>
      <style>
        body{font:14px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;max-width:760px;margin:32px auto;padding:0 24px}
        .print-brand{display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid #ddd}
        .print-brand img{height:28px;width:auto}
        .print-brand .meta{font-size:11px;color:#666;margin-top:2px}
        h1{font-size:24px}h2{font-size:18px;margin-top:1.4em}h3{font-size:15px}
        table{border-collapse:collapse;width:100%;margin:1em 0}
        th,td{border:1px solid #999;padding:6px 8px;text-align:left;font-size:12px}
        hr{border:none;border-top:1px solid #ccc;margin:1.5em 0}
        em{color:#555}
        @media print{.print-brand{break-after:avoid}}
      </style></head><body>
      <header class="print-brand">
        <img src="${window.location.origin}/brand/logo-black.svg" alt="VYBZ" onerror="this.style.display='none'" />
        <div>
          <strong style="font-size:15px">VYBZ Codex</strong>
          <div class="meta">${meta}</div>
        </div>
      </header>
      <h1>${title}</h1>
      ${html}
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  if (error || !doc) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-white/60">
        <FileWarning className="h-8 w-8 text-white/30" />
        <p>This document isn't available.</p>
        <button onClick={() => navigate("/codex")} className="btn btn-ghost">Back to Codex</button>
      </div>
    );
  }

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-12 pt-3">
      <div className="mx-auto max-w-2xl">
        <div className="mb-3 flex items-center gap-2">
          <button onClick={() => navigate("/codex")} aria-label="Back to Codex" className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"><ArrowLeft className="h-4 w-4" /></button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-bold text-white">{doc.title}</h1>
            <p className="text-[11px] text-white/40">{doc.jurisdiction} · v{doc.version} · Astra Matrix, Inc.</p>
          </div>
          <a href={doc.path} download={`${doc.slug}.md`} className="flex h-9 items-center gap-1.5 rounded-full bg-white/8 px-3 text-xs font-semibold text-white/85 active:scale-95"><Download className="h-3.5 w-3.5" /> .md</a>
          <button onClick={print} className="flex h-9 items-center gap-1.5 rounded-full bg-veil-500/20 px-3 text-xs font-semibold text-veil-100 active:scale-95"><Printer className="h-3.5 w-3.5" /> Print</button>
        </div>

        {doc.kind === "template" && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-3 py-2 text-[11px] leading-snug text-amber-200/90">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Informational template, not legal advice — no attorney–client relationship is created. Laws vary by jurisdiction; have a qualified attorney review before signing.</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
        ) : (
          <article className="codex-prose" dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
    </div>
  );
}
