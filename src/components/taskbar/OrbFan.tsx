import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, Plus, Radio, Sparkles, type LucideIcon } from "lucide-react";
import { useReduceFx } from "@/lib/display";
import { cx } from "@/lib/utils";

export type OrbFanAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  hue: string;
  run: () => void;
};

export const DEFAULT_ORB_ACTIONS: Omit<OrbFanAction, "run">[] = [
  { id: "drop", label: "New drop", icon: Plus, hue: "#a87cf8" },
  { id: "live", label: "Go live", icon: Radio, hue: "#f472b6" },
  { id: "spark", label: "Spark", icon: Sparkles, hue: "#38bdf8" },
  { id: "messages", label: "Messages", icon: MessageSquare, hue: "#34d399" },
];

interface OrbFanProps {
  open: boolean;
  actions: OrbFanAction[];
  onClose: () => void;
  /** Dock: fan upward. Rail: fan into the stage (end / right). */
  direction?: "up" | "end";
}

/** Action chips from the orb — independent glow hues + hover tilt. */
export function OrbFan({ open, actions, onClose, direction = "up" }: OrbFanProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduce = useReduceFx();
  const focusIdx = useRef(0);
  const rail = direction === "end";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const next = rail
        ? (e.key === "ArrowDown" || e.key === "ArrowRight")
        : e.key === "ArrowRight";
      const prev = rail
        ? (e.key === "ArrowUp" || e.key === "ArrowLeft")
        : e.key === "ArrowLeft";
      if (next || prev) {
        e.preventDefault();
        const dir = next ? 1 : -1;
        focusIdx.current = (focusIdx.current + dir + actions.length) % actions.length;
        const btn = rootRef.current?.querySelectorAll<HTMLButtonElement>("[data-orb-fan]")[focusIdx.current];
        btn?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, actions.length, onClose, rail]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={rootRef}
          role="menu"
          aria-label="Orb actions"
          initial={{ opacity: 0, ...(rail ? { x: -12 } : { y: 12 }) }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, ...(rail ? { x: -8 } : { y: 8 }) }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className={cx(
            "pointer-events-auto absolute z-30 flex gap-2.5 sm:gap-3",
            rail
              ? "left-[calc(100%+0.65rem)] top-1/2 -translate-y-1/2 flex-col items-start"
              : "bottom-[calc(100%+0.65rem)] left-1/2 -translate-x-1/2 items-end",
          )}
        >
          {actions.map((action, i) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.id}
                type="button"
                data-orb-fan
                role="menuitem"
                initial={{ opacity: 0, scale: 0.85, ...(rail ? { x: -16 } : { y: 16 }) }}
                animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, ...(rail ? { x: -10 } : { y: 10 }) }}
                transition={{ type: "spring", stiffness: 400, damping: 26, delay: i * 0.04 }}
                whileHover={reduce ? undefined : {
                  rotate: i % 2 === 0 ? -8 : 8,
                  ...(rail ? { x: 4 } : { y: -4 }),
                  scale: 1.06,
                }}
                whileTap={{ scale: 0.94 }}
                onClick={() => action.run()}
                className={cx(
                  "group flex min-w-[4.5rem] flex-col items-center gap-1.5 rounded-2xl px-1 outline-none",
                  "focus-visible:ring-2 focus-visible:ring-white/40",
                )}
              >
                <span
                  className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-ink-900/92 text-white shadow-[0_12px_28px_-16px_rgba(0,0,0,0.9)] backdrop-blur-xl transition"
                  style={{
                    boxShadow: `0 0 0 1px ${action.hue}55, 0 0 22px -6px ${action.hue}`,
                  }}
                >
                  <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" style={{ color: action.hue }} />
                </span>
                <span className="text-[10px] font-semibold tracking-wide text-white/60 group-hover:text-white/90">
                  {action.label}
                </span>
              </motion.button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
