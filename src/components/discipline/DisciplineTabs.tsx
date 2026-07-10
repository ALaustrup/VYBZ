import { motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { cx } from "@/lib/utils";
import type { DisciplineModule } from "@/types";

/**
 * Horizontal, wrapping tab bar — one pill per discipline module — with a smooth
 * shared active indicator, a hover-reveal remove (×), and a prominent add (＋).
 */
export function DisciplineTabs({
  modules, activeId, onSelect, onRemove, onAdd,
}: {
  modules: DisciplineModule[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {modules.map((m) => {
        const active = m.id === activeId;
        return (
          <div key={m.id} className="group relative">
            <button onClick={() => onSelect(m.id)}
              className={cx("relative flex items-center rounded-full px-4 py-2 text-sm font-semibold transition",
                active ? "text-white" : "text-white/55 hover:text-white/85")}>
              {active && (
                <motion.span layoutId="discipline-tab" transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className="absolute inset-0 rounded-full bg-veil-500/25 ring-1 ring-veil-400/50" />
              )}
              <span className="relative z-10 whitespace-nowrap pr-1">{m.label}</span>
            </button>
            <button onClick={() => onRemove(m.id)} aria-label={`Remove ${m.label}`}
              className={cx("absolute -right-1 -top-1 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-wild text-white opacity-0 shadow transition group-hover:opacity-100 focus:opacity-100 active:scale-90",
                "max-lg:opacity-100")}>
              <X className="h-2.5 w-2.5" strokeWidth={3} />
            </button>
          </div>
        );
      })}
      <button onClick={onAdd}
        className="flex items-center gap-1 rounded-full border border-dashed border-white/20 px-3.5 py-2 text-sm font-semibold text-white/60 transition hover:border-veil-400/60 hover:text-white active:scale-95">
        <Plus className="h-4 w-4" /> Add discipline
      </button>
    </div>
  );
}
