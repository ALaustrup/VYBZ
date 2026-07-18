import { useState } from "react";
import { ExternalLink, Loader2, Lock, Plus, Puzzle, Trash2, X } from "lucide-react";
import { WIDGET_KINDS, WIDGET_LABEL, embedSrc, embedHeight, type WidgetKind } from "@/lib/widgets";
import { cx } from "@/lib/utils";
import type { ProjectWidget } from "@/types";

function hostOf(url?: string): string {
  if (!url) return "link";
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

/** Renders a single widget: live embed, link card, or a gated connector notice. */
export function WidgetCard({ widget, onRemove }: { widget: ProjectWidget; onRemove?: () => void }) {
  const kind = WIDGET_KINDS.find((k) => k.id === widget.kind);
  const url = widget.config?.url;
  const src = kind?.embed ? embedSrc(widget.kind, url) : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
        <Puzzle className="h-3.5 w-3.5 text-veil-200" />
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-white/80">{widget.title || WIDGET_LABEL[widget.kind] || widget.kind}</span>
        {onRemove && (
          <button onClick={onRemove} aria-label="Remove widget" className="rounded-full p-1 text-white/40 hover:text-wild active:scale-90"><Trash2 className="h-3.5 w-3.5" /></button>
        )}
      </div>
      {kind?.gated ? (
        <div className="flex items-center gap-2 px-3 py-4 text-[12px] text-white/50">
          <Lock className="h-4 w-4 shrink-0 text-amber-300" />
          <span>{WIDGET_LABEL[widget.kind]} connector — analytics coming soon (needs API setup).</span>
        </div>
      ) : src ? (
        <iframe
          src={src}
          title={widget.title || widget.kind}
          loading="lazy"
          className="w-full"
          style={{ height: embedHeight(widget.kind, src), border: 0 }}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-4 text-[13px] text-veil-100 hover:text-white">
          <ExternalLink className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{hostOf(url)}</span>
        </a>
      )}
    </div>
  );
}

/** Modal: pick a widget kind, then paste a URL (embed kinds) and add it. */
export function WidgetPicker({ onAdd, onClose }: { onAdd: (kind: string, config: Record<string, unknown>, title?: string) => Promise<void>; onClose: () => void }) {
  const [chosen, setChosen] = useState<WidgetKind | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!chosen || chosen.gated) return;
    if (chosen.embed && !url.trim()) return;
    setBusy(true);
    try { await onAdd(chosen.id, { url: url.trim() }, title.trim() || undefined); onClose(); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-900/95 p-5 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-2xl sm:rounded-3xl sm:border">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-gradient"><Puzzle className="h-4 w-4 text-veil-200" /> Add a widget</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full glass"><X className="h-4 w-4" /></button>
        </div>

        {!chosen ? (
          <>
            <p className="mb-3 text-[12px] text-white/50">Pick a source to showcase or monitor on this project.</p>
            <div className="grid grid-cols-2 gap-2">
              {WIDGET_KINDS.map((k) => (
                <button key={k.id} onClick={() => !k.gated && setChosen(k)} disabled={k.gated}
                  className={cx("flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition active:scale-[0.98]",
                    k.gated ? "cursor-not-allowed border-white/8 bg-white/[0.02] opacity-70" : "border-white/10 bg-white/[0.04] hover:border-veil-400/50")}>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-white">{k.label}{k.gated && <Lock className="h-3 w-3 text-amber-300" />}</span>
                  <span className="text-[11px] text-white/45">{k.gated ? (k.hint ? `${k.hint} · soon` : "Coming soon") : "Embed"}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button onClick={() => setChosen(null)} className="mb-3 text-[12px] text-white/50 hover:text-white/80">← All widgets</button>
            <p className="mb-2 text-sm font-semibold text-white">{chosen.label}</p>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={chosen.placeholder}
              className="mb-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
            <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 60))} placeholder="Label (optional)"
              className="mb-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
            <button onClick={add} disabled={busy || !url.trim()} className="btn btn-primary w-full py-3 disabled:opacity-40">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Add widget</>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** A project's widget dashboard section (editable for the owner). */
export function ProjectWidgets({ widgets, editable, onAdd, onRemove }: {
  widgets: ProjectWidget[];
  editable?: boolean;
  onAdd?: (kind: string, config: Record<string, unknown>, title?: string) => Promise<void>;
  onRemove?: (id: string) => void;
}) {
  const [picking, setPicking] = useState(false);
  return (
    <div>
      {widgets.length === 0 ? (
        editable ? (
          <p className="rounded-2xl border border-white/8 bg-white/[0.02] px-3.5 py-3 text-xs text-white/45">No widgets yet. Add your Spotify, YouTube, SoundCloud and more to showcase this project.</p>
        ) : null
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {widgets.map((w) => <WidgetCard key={w.id} widget={w} onRemove={editable && onRemove ? () => onRemove(w.id) : undefined} />)}
        </div>
      )}
      {editable && (
        <button onClick={() => setPicking(true)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-veil-400/40 bg-veil-500/[0.06] py-2.5 text-sm font-semibold text-veil-100 active:scale-[0.99]">
          <Plus className="h-4 w-4" /> Add widget
        </button>
      )}
      {picking && onAdd && <WidgetPicker onAdd={onAdd} onClose={() => setPicking(false)} />}
    </div>
  );
}
