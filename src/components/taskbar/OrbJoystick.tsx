import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OrbSphere } from "@/components/taskbar/OrbSphere";
import { DEFAULT_ORB_ACTIONS, OrbFan, type OrbFanAction } from "@/components/taskbar/OrbFan";
import { usePlayer } from "@/lib/audioBus";
import { useReduceFx } from "@/lib/display";
import { sampleReactiveFrame } from "@/lib/reactiveVisualRuntime";
import { cx } from "@/lib/utils";

/** Stick deadzone (normalized 0..1). Below = no sector. */
const DEADZONE = 0.32;
/** Max visual stick throw as fraction of hit radius. */
const THROW = 0.42;
/** Ring glyph radius from orb center (px). */
const RING_R = 58;

/** Screen angles: 0 = east, -π/2 = north (y-down). */
const ACTION_ANGLES: Record<string, number> = {
  drop: -Math.PI / 2,
  live: 0,
  spark: Math.PI,
  messages: Math.PI / 2,
};

function normAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function nearestAction(nx: number, ny: number, actions: OrbFanAction[]): OrbFanAction | null {
  const mag = Math.hypot(nx, ny);
  if (mag < DEADZONE) return null;
  const ang = Math.atan2(ny, nx);
  let best: OrbFanAction | null = null;
  let bestDiff = Infinity;
  for (const action of actions) {
    const target = ACTION_ANGLES[action.id] ?? 0;
    const d = Math.abs(normAngle(ang - target));
    if (d < bestDiff) {
      bestDiff = d;
      best = action;
    }
  }
  // Require being roughly in that cone (±55°)
  if (bestDiff > (55 * Math.PI) / 180) return null;
  return best;
}

function snapStick(nx: number, ny: number, action: OrbFanAction | null): { x: number; y: number } {
  const mag = Math.min(1, Math.hypot(nx, ny));
  if (!action || mag < DEADZONE) {
    return { x: nx * THROW, y: ny * THROW };
  }
  const ang = ACTION_ANGLES[action.id] ?? Math.atan2(ny, nx);
  const m = Math.max(DEADZONE + 0.08, mag) * THROW;
  return { x: Math.cos(ang) * m, y: Math.sin(ang) * m };
}

function hapticTick() {
  try {
    navigator.vibrate?.(10);
  } catch { /* ignore */ }
}

interface OrbJoystickProps {
  actions: OrbFanAction[];
  disabled?: boolean;
}

/**
 * Orb Joystick Phase 1 — top-down stick: hover calms sphere, hold+drag selects
 * a cardinal action, release to run. Reduced-motion keeps OrbFan chips.
 */
export function OrbJoystick({ actions, disabled }: OrbJoystickProps) {
  const reduce = useReduceFx();
  const { playing } = usePlayer();
  const zoneRef = useRef<HTMLDivElement>(null);
  const [fanOpen, setFanOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [aiming, setAiming] = useState(false);
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [beatPulse, setBeatPulse] = useState(0);
  const activeRef = useRef<string | null>(null);
  const aimingRef = useRef(false);

  // Soft audio pulse on the sector ring while aiming / hovering (Orb stays calm)
  useEffect(() => {
    if (reduce || (!hovering && !aiming) || !playing) {
      setBeatPulse(0);
      return;
    }
    let raf = 0;
    const tick = () => {
      const f = sampleReactiveFrame(true);
      setBeatPulse(f.beat * 0.08 + f.level * 0.03);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce, hovering, aiming, playing]);

  const list = actions.length ? actions : DEFAULT_ORB_ACTIONS.map((a) => ({ ...a, run: () => {} }));
  const calm = !reduce && (hovering || aiming);
  const showRing = !reduce && (hovering || aiming) && !disabled;

  useEffect(() => {
    if (disabled) {
      setAiming(false);
      aimingRef.current = false;
      setStick({ x: 0, y: 0 });
      setActiveId(null);
      activeRef.current = null;
      setFanOpen(false);
    }
  }, [disabled]);

  function toggleFan() {
    if (disabled) return;
    if (!fanOpen) {
      setFlash(true);
      window.setTimeout(() => setFlash(false), 220);
    }
    setFanOpen((v) => !v);
  }

  function updateFromPoint(clientX: number, clientY: number) {
    const el = zoneRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const hit = Math.min(r.width, r.height) * 0.5;
    let nx = dx / (hit * 0.95);
    let ny = dy / (hit * 0.95);
    const mag = Math.hypot(nx, ny);
    if (mag > 1) {
      nx /= mag;
      ny /= mag;
    }
    const action = nearestAction(nx, ny, list);
    const snapped = snapStick(nx, ny, action);
    setStick(snapped);
    const nextId = action?.id ?? null;
    if (nextId !== activeRef.current) {
      activeRef.current = nextId;
      setActiveId(nextId);
      if (nextId) hapticTick();
    }
  }

  function onPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    if (disabled || reduce) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    aimingRef.current = true;
    setAiming(true);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 180);
    updateFromPoint(e.clientX, e.clientY);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!aimingRef.current) return;
    updateFromPoint(e.clientX, e.clientY);
  }

  function endAim(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!aimingRef.current) return;
    aimingRef.current = false;
    setAiming(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch { /* ignore */ }
    const chosen = list.find((a) => a.id === activeRef.current);
    setStick({ x: 0, y: 0 });
    setActiveId(null);
    activeRef.current = null;
    if (chosen) {
      hapticTick();
      chosen.run();
    }
    // Drop hover calm if pointer left the zone during the drag
    const zone = zoneRef.current;
    if (zone) {
      const r = zone.getBoundingClientRect();
      const inside =
        e.clientX >= r.left && e.clientX <= r.right &&
        e.clientY >= r.top && e.clientY <= r.bottom;
      setHovering(inside);
    }
  }

  // Reduced motion: classic fan tray
  if (reduce) {
    return (
      <div className="relative flex items-center justify-center">
        <OrbFan open={fanOpen && !disabled} actions={list} onClose={() => setFanOpen(false)} direction="up" />
        <OrbSphere open={fanOpen && !disabled} flash={flash} onClick={toggleFan} />
      </div>
    );
  }

  return (
    <div
      ref={zoneRef}
      className={cx(
        "relative flex h-[72px] w-[72px] items-center justify-center sm:h-[76px] sm:w-[76px]",
        disabled && "pointer-events-none opacity-40",
      )}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => {
        if (!aimingRef.current) setHovering(false);
      }}
    >
      <AnimatePresence>
        {showRing && (
          <motion.div
            key="ring"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="pointer-events-none absolute inset-0 z-0"
            aria-hidden
          >
            {list.map((action) => {
              const ang = ACTION_ANGLES[action.id] ?? 0;
              const ring = RING_R * (1 + beatPulse);
              const x = Math.cos(ang) * ring;
              const y = Math.sin(ang) * ring;
              const on = activeId === action.id;
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.id}
                  className="absolute flex w-[4.5rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
                  style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
                  animate={{
                    scale: (on ? 1.12 : aiming ? 0.92 : 0.88) + beatPulse * 0.35,
                    opacity: on ? 1 : aiming ? 0.55 : 0.4,
                  }}
                >
                  <span
                    className={cx(
                      "grid h-10 w-10 place-items-center rounded-full border backdrop-blur-md transition-shadow",
                      on ? "border-white/35 bg-ink-950/70" : "border-white/12 bg-ink-950/45",
                    )}
                    style={{
                      boxShadow: on
                        ? `0 0 0 1px ${action.hue}88, 0 0 22px -4px ${action.hue}`
                        : `0 0 0 1px ${action.hue}33, 0 0 14px -8px ${action.hue}`,
                    }}
                  >
                    <Icon className="h-4 w-4" style={{ color: action.hue }} />
                  </span>
                  <span
                    className={cx(
                      "text-[9px] font-semibold tracking-wide",
                      on ? "text-white" : "text-white/50",
                    )}
                  >
                    {action.label}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <OrbSphere
        open={aiming}
        flash={flash}
        calm={calm}
        stick={stick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endAim}
        onPointerCancel={endAim}
        ariaLabel={aiming ? "Aim Orb — release to select" : "Orb joystick — hold and drag to choose"}
      />
    </div>
  );
}
