import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Plus, Search, Sparkles, X } from "lucide-react";
import { cx } from "@/lib/utils";
import * as api from "@/lib/api";
import type { DisciplineCategory } from "@/types";

/**
 * Beautiful, searchable, categorized discipline picker. Suggests based on the
 * verticals the creator already works in, disables disciplines already added,
 * and adds the chosen one instantly.
 */
export function AddDisciplineModal({
  open, categories, existing, suggestions, onPick, onClose,
}: {
  open: boolean;
  categories: DisciplineCategory[];
  existing: string[];
  suggestions: string[];
  onPick: (roleId: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function requestCustom() {
    const label = q.trim();
    if (label.length < 2 || requesting) return;
    setRequesting(true); setNote(null);
    try {
      const res = await api.requestCustomDiscipline(label);
      if (res.status === "auto_mapped" && res.mappedRoleId) {
        onPick(res.mappedRoleId);
      } else {
        setNote(`Thanks — “${label}” is queued for review. We're expanding disciplines across every field.`);
      }
    } catch { setNote("Couldn't submit that just now."); }
    finally { setRequesting(false); }
  }

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return categories
      .map((c) => ({
        ...c,
        disciplines: c.disciplines.filter((d) => !query || d.label.toLowerCase().includes(query) || c.label.toLowerCase().includes(query)),
      }))
      .filter((c) => c.disciplines.length > 0);
  }, [categories, q]);

  const suggested = useMemo(() => {
    const all = categories.flatMap((c) => c.disciplines);
    return suggestions.map((id) => all.find((d) => d.id === id)).filter(Boolean).filter((d) => !existing.includes(d!.id)).slice(0, 6);
  }, [categories, suggestions, existing]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="glass-panel relative z-10 flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl">
            <div className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-bold text-white">Add a discipline</h2>
                <p className="text-[12px] text-white/45">Every creative hat you wear becomes its own rich module.</p>
              </div>
              <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"><X className="h-4 w-4" /></button>
            </div>

            <div className="px-5 pt-4">
              <label className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 focus-within:border-veil-400/60">
                <Search className="h-4 w-4 text-white/40" />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search disciplines…"
                  className="w-full bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none" />
              </label>
            </div>

            <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-4">
              {!q && suggested.length > 0 && (
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-aqua-200/80"><Sparkles className="h-3.5 w-3.5" /> Suggested for you</p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggested.map((d) => (
                      <button key={d!.id} onClick={() => onPick(d!.id)}
                        className="rounded-full bg-aqua-400/15 px-3 py-1.5 text-[12px] font-medium text-aqua-100 ring-1 ring-aqua-400/30 active:scale-95">
                        {d!.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filtered.map((c) => (
                <div key={c.id} className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">{c.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.disciplines.map((d) => {
                      const added = existing.includes(d.id);
                      return (
                        <button key={d.id} disabled={added} onClick={() => onPick(d.id)}
                          className={cx("flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium transition active:scale-95",
                            added ? "cursor-default bg-feel/15 text-feel/80" : "bg-white/[0.05] text-white/75 hover:bg-veil-500/25 hover:text-white")}>
                          {added && <Check className="h-3 w-3" />}{d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {q.trim().length >= 2 && (
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                  {note ? (
                    <p className="text-[12px] text-white/60">{note}</p>
                  ) : (
                    <button onClick={requestCustom} disabled={requesting}
                      className="flex w-full items-center gap-2 text-left text-[13px] font-medium text-white/75 hover:text-white">
                      {requesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 text-veil-300" />}
                      Add “{q.trim()}” as a discipline
                    </button>
                  )}
                  {filtered.length === 0 && !note && (
                    <p className="mt-1.5 text-[11px] text-white/35">No exact match — we’ll map it to the closest discipline or add it soon.</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
