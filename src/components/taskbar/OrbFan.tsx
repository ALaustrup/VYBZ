import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, Plus, Radio, Sparkles, type LucideIcon } from "lucide-react";
import { readBands, usePlayer } from "@/lib/audioBus";
import { useFxScale, useReduceFx } from "@/lib/display";
import { resolvePlaybackVisuals } from "@/lib/playbackCustomization";
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
  { id: "releases", label: "Analyzer", icon: Sparkles, hue: "#38bdf8" },
  { id: "messages", label: "Messages", icon: MessageSquare, hue: "#34d399" },
];

interface OrbFanProps {
  open: boolean;
  actions: OrbFanAction[];
  onClose: () => void;
  /** Dock: fan upward. Rail: fan into the stage (end / right). */
  direction?: "up" | "end";
}

/** Action chips from the orb — centered glass tray that softly mirrors Orb light. */
export function OrbFan({ open, actions, onClose, direction = "up" }: OrbFanProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const reduce = useReduceFx();
  const fxScale = useFxScale();
  const focusIdx = useRef(0);
  const rail = direction === "end";
  const { playing, track } = usePlayer();
  const visuals = useMemo(
    () => resolvePlaybackVisuals({
      seed: track?.seed,
      accent: track?.accent,
      fx: track?.fx,
      playback: track?.playback,
    }),
    [track?.seed, track?.accent, track?.fx, track?.playback],
  );
  const accent = visuals.accent;

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

  // Soft specular wash from Orb accent / audio bands while the tray is open.
  useEffect(() => {
    if (!open || reduce || fxScale < 0.02) {
      const el = glassRef.current;
      if (el) {
        el.style.setProperty("--fan-specular", "0");
        el.style.setProperty("--fan-accent", accent);
      }
      return;
    }
    let raf = 0;
    const tick = () => {
      const el = glassRef.current;
      if (el) {
        const b = playing ? readBands() : { bass: 0, mid: 0, high: 0, level: 0 };
        const energy = Math.min(1, (b.level * 0.55 + b.mid * 0.35 + b.bass * 0.25) * fxScale);
        el.style.setProperty("--fan-specular", String(0.08 + energy * 0.28));
        el.style.setProperty("--fan-accent", accent);
        el.style.setProperty("--fan-glow", `${accent}${energy > 0.35 ? "99" : "66"}`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, reduce, fxScale, playing, accent]);

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
            "pointer-events-auto absolute z-30",
            rail
              ? "left-[calc(100%+0.55rem)] top-1/2 -translate-y-1/2"
              : "bottom-[calc(100%+0.55rem)] left-1/2 -translate-x-1/2",
          )}
        >
          <div
            ref={glassRef}
            className={cx(
              "relative overflow-hidden rounded-3xl border border-white/12 px-3 py-2.5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.95)] backdrop-blur-2xl",
              rail ? "flex flex-col items-center gap-2.5" : "flex items-center justify-center gap-2.5 sm:gap-3",
            )}
            style={{
              background: "rgba(10, 10, 16, 0.72)",
              boxShadow: `
                inset 0 1px 0 0 rgba(255,255,255,0.14),
                inset 0 -1px 0 0 rgba(255,255,255,0.04),
                0 0 28px -12px var(--fan-glow, transparent)
              `,
              ["--fan-accent" as string]: accent,
              ["--fan-glow" as string]: `${accent}66`,
              ["--fan-specular" as string]: "0.12",
            }}
          >
            {/* Orb-mirrored wash — opacity tracks audio via --fan-specular */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background: `radial-gradient(120% 90% at 50% 0%, var(--fan-accent, ${accent}), transparent 55%)`,
                opacity: "var(--fan-specular, 0.12)",
                mixBlendMode: "screen",
              }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-4 top-0 h-px"
              style={{
                background: `linear-gradient(90deg, transparent, color-mix(in srgb, var(--fan-accent, ${accent}) 75%, white), transparent)`,
                opacity: "calc(0.4 + var(--fan-specular, 0.12))",
              }}
            />            {actions.map((action, i) => {
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
                    rotate: i % 2 === 0 ? -6 : 6,
                    ...(rail ? { x: 3 } : { y: -3 }),
                    scale: 1.05,
                  }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => action.run()}
                  className={cx(
                    "group flex min-w-[4.25rem] flex-col items-center gap-1.5 rounded-2xl px-1 outline-none",
                    "focus-visible:ring-2 focus-visible:ring-white/40",
                  )}
                >
                  <span
                    className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-ink-950/55 text-white backdrop-blur-md transition"
                    style={{
                      boxShadow: `0 0 0 1px ${action.hue}44, 0 0 18px -8px ${action.hue}`,
                    }}
                  >
                    <Icon className="h-[18px] w-[18px]" style={{ color: action.hue }} />
                  </span>
                  <span className="text-center text-[10px] font-semibold tracking-wide text-white/65 group-hover:text-white/90">
                    {action.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
