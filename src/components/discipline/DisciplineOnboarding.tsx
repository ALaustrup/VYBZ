import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import * as api from "@/lib/api";
import { cx } from "@/lib/utils";
import type { DisciplineCategory } from "@/types";

const MAX = 5;

/**
 * Post-signup, low-pressure prompt: "What creative hats do you wear?" Lets a new
 * creator pick 1–3 (up to 5) disciplines up front, then drops them into the
 * dashboard to flesh each out. Skippable — never a wall.
 */
export function DisciplineOnboarding({ onComplete }: { onComplete: () => void }) {
  const navigate = useNavigate();
  const [cats, setCats] = useState<DisciplineCategory[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.listDisciplines().then(setCats); }, []);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX ? p : [...p, id]));

  async function cont() {
    if (picked.length === 0) { onComplete(); return; }
    setBusy(true);
    try {
      for (const roleId of picked) await api.upsertModule({ roleId });
    } catch { /* best-effort; the dashboard is the source of truth */ }
    onComplete();
    navigate("/profile/disciplines");
  }

  return (
    <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-5 py-8">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
        className="glass-panel flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl">
        <div className="px-6 pt-6">
          <h1 className="font-display text-2xl font-bold text-gradient">What creative hats do you wear?</h1>
          <p className="mt-1 text-sm text-white/55">Pick a few disciplines — each becomes a rich module that finds you the right people. You can refine them next, and add more anytime.</p>
        </div>

        <div className="no-scrollbar my-4 flex-1 space-y-5 overflow-y-auto px-6">
          {cats.length === 0 ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-veil-300" /></div>
          ) : cats.map((c) => (
            <div key={c.id} className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">{c.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {c.disciplines.map((d) => {
                  const on = picked.includes(d.id);
                  return (
                    <button key={d.id} onClick={() => toggle(d.id)}
                      className={cx("flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium transition active:scale-95",
                        on ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50" : "bg-white/[0.05] text-white/70 hover:bg-white/10")}>
                      {on && <Check className="h-3 w-3" />}{d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-white/8 px-6 py-4">
          <button onClick={onComplete} className="text-sm font-medium text-white/45 hover:text-white/70">I'll do this later</button>
          <span className="ml-auto text-[12px] text-white/40">{picked.length}/{MAX}</span>
          <button onClick={cont} disabled={busy}
            className="btn btn-primary h-10 px-4 py-0 text-sm">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{picked.length ? "Continue" : "Skip for now"} <ArrowRight className="h-4 w-4" /></>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
