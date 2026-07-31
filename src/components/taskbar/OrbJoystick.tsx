import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { OrbSphere } from "@/components/taskbar/OrbSphere";
import { DEFAULT_ORB_ACTIONS, OrbFan, type OrbFanAction } from "@/components/taskbar/OrbFan";
import { usePlayer } from "@/lib/audioBus";
import { useReduceFx } from "@/lib/display";
import { easeOutExpo, springSnappy, withReduce } from "@/lib/motion";
import { sampleReactiveFrame } from "@/lib/reactiveVisualRuntime";
import { cx } from "@/lib/utils";

/** Stick deadzone (normalized 0..1). Below = no sector. */
const DEADZONE = 0.28;
/** Max visual stick throw as fraction of ring radius. */
const THROW = 0.55;
/** Ring glyph radius from orb center (px) — outside Orb DRAW/2 so icons stay clear. */
const RING_R = 76;

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

function setOrbFocus(on: boolean) {
  try {
    if (on) document.documentElement.setAttribute("data-orb-focus", "1");
    else document.documentElement.removeAttribute("data-orb-focus");
  } catch { /* ignore */ }
}

interface OrbJoystickProps {
  actions: OrbFanAction[];
  disabled?: boolean;
}

/**
 * Orb Joystick — compact centered sphere; hold+drag selects a cardinal action.
 * Focus mode dims the stage and lights the surrounding menu ring.
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
  const focusOn = showRing || (reduce && fanOpen && !disabled);

  useEffect(() => {
    setOrbFocus(focusOn);
    return () => setOrbFocus(false);
  }, [focusOn]);

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
    // Normalize against menu ring — not the tiny 48px hit — so sectors land on icons.
    let nx = dx / RING_R;
    let ny = dy / RING_R;
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
    const zone = zoneRef.current;
    if (zone) {
      const r = zone.getBoundingClientRect();
      const inside =
        e.clientX >= r.left && e.clientX <= r.right &&
        e.clientY >= r.top && e.clientY <= r.bottom;
      setHovering(inside);
    }
  }

  const dimOverlay = typeof document !== "undefined"
    ? createPortal(
        <AnimatePresence>
          {focusOn && (
            <motion.div
              key="orb-dim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={withReduce(reduce, easeOutExpo)}
              className="pointer-events-none fixed inset-0 z-[65]"
              aria-hidden
              style={{
                background:
                  "radial-gradient(ellipse 55% 50% at 50% 92%, rgba(8,10,18,0.35) 0%, rgba(0,0,0,0.72) 55%, rgba(0,0,0,0.82) 100%)",
                backdropFilter: reduce ? undefined : "blur(2px)",
              }}
            />
          )}
        </AnimatePresence>,
        document.body,
      )
    : null;

  // Reduced motion: classic fan tray
  if (reduce) {
    return (
      <>
        {dimOverlay}
        <div className="relative flex items-center justify-center">
          <OrbFan open={fanOpen && !disabled} actions={list} onClose={() => setFanOpen(false)} direction="up" />
          <OrbSphere open={fanOpen && !disabled} flash={flash} onClick={toggleFan} />
        </div>
      </>
    );
  }

  return (
    <>
      {dimOverlay}
      <div
        ref={zoneRef}
        className={cx(
          "relative flex h-[48px] w-[48px] items-center justify-center overflow-visible",
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
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={springSnappy}
              className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-0 w-0"
              aria-hidden
            >
              <span
                className="absolute left-0 top-0 h-[10.5rem] w-[10.5rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(255,255,255,0.10) 0%, rgb(var(--accent-rgb) / 0.10) 38%, transparent 68%)",
                  boxShadow: "var(--shadow-glow)",
                }}
              />
              {list.map((action) => {
                const ang = ACTION_ANGLES[action.id] ?? 0;
                const ring = RING_R * (1 + beatPulse * 0.35);
                const x = Math.cos(ang) * ring;
                const y = Math.sin(ang) * ring;
                const on = activeId === action.id;
                const Icon = action.icon;
                return (
                  <motion.div
                    key={action.id}
                    className="absolute flex w-[4.25rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
                    style={{ left: x, top: y }}
                    animate={{
                      scale: (on ? 1.14 : aiming ? 1.02 : 0.96) + beatPulse * 0.25,
                      opacity: on ? 1 : aiming ? 0.92 : 0.82,
                    }}
                  >
                    <span
                      className={cx(
                        "grid h-9 w-9 place-items-center rounded-full border backdrop-blur-md transition-shadow",
                        on ? "border-white/55 bg-ink-950/70" : "border-white/28 bg-ink-950/55",
                      )}
                      style={{
                        boxShadow: on
                          ? `0 0 0 1px ${action.hue}, 0 0 22px 2px ${action.hue}, 0 0 36px -4px ${action.hue}`
                          : `0 0 0 1px ${action.hue}99, 0 0 16px 0 ${action.hue}99`,
                        filter: on ? "brightness(1.3) saturate(1.2)" : "brightness(1.12) saturate(1.1)",
                      }}
                    >
                      <Icon
                        className="h-4 w-4"
                        style={{
                          color: action.hue,
                          filter: `drop-shadow(0 0 5px ${action.hue})`,
                        }}
                      />
                    </span>
                    <span
                      className={cx(
                        "text-[9px] font-semibold tracking-wide",
                        on ? "text-white" : "text-white/88",
                      )}
                      style={{
                        textShadow: on
                          ? `0 0 12px ${action.hue}, 0 0 4px rgba(255,255,255,0.8)`
                          : `0 0 10px ${action.hue}cc`,
                      }}
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
    </>
  );
}
