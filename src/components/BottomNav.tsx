import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Layers, MessagesSquare, Radio, User } from "lucide-react";
import { useApp } from "@/store/AppStore";
import { dockColorAt, dockColorTheme, dockFxStyle } from "@/lib/dock";
import { cx, haptic } from "@/lib/utils";
import { playSound } from "@/lib/sound";

// Four destinations. Feeds holds World/Local/Trending; You is the dashboard;
// Chat aggregates the hub + room/circle/random; Live is the live-stream
// carousel (community-curated via swipe Vyb/Fail).
const ITEMS = [
  { to: "/", label: "Feeds", icon: Layers, end: true, match: ["/local", "/trending"] as string[] },
  { to: "/chat", label: "Chat", icon: MessagesSquare, end: false, match: ["/rooms", "/circles"] },
  { to: "/live", label: "Live", icon: Radio, end: false, match: [] },
  { to: "/profile", label: "You", icon: User, end: false, match: ["/you"] },
];

// macOS-style dock magnification + proximity glow tuning. Magnification is a
// pure CSS transform (scale) on a fixed-size base box, so the bar's own height
// never changes on hover — only the icons grow.
const BASE = 44;
const PEAK = 64;
const PEAK_SCALE = PEAK / BASE;
const RANGE = 110;
const GLOW_RANGE = 64;

const reduceMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Subtle gyroscopic tilt for the dock. Reads the device's orientation and maps
 * it to a gentle 3D rotation + a sheen that slides across the glass, so the bar
 * feels like a physical pane of dark glass catching the light as you move. On
 * desktop / unsupported devices it simply stays flat (graceful no-op).
 */
function useGyroTilt() {
  const rotateX = useSpring(0, { stiffness: 120, damping: 20, mass: 0.4 });
  const rotateY = useSpring(0, { stiffness: 120, damping: 20, mass: 0.4 });
  const sheen = useSpring(50, { stiffness: 120, damping: 20, mass: 0.4 });

  useEffect(() => {
    if (reduceMotion || typeof window === "undefined") return;
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    function onOrient(e: DeviceOrientationEvent) {
      const gamma = e.gamma ?? 0; // left/right tilt, ~[-90, 90]
      const beta = e.beta ?? 0; // front/back tilt, neutral ~45° in hand
      const gy = clamp(gamma / 45, -1, 1);
      const bx = clamp((beta - 45) / 45, -1, 1);
      rotateY.set(gy * 7);
      rotateX.set(-bx * 5);
      sheen.set(50 + gy * 42);
    }
    window.addEventListener("deviceorientation", onOrient, { passive: true });
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, [rotateX, rotateY, sheen]);

  const sheenBg = useMotionTemplate`radial-gradient(140px 70px at ${sheen}% -10%, rgba(255,255,255,0.16), transparent 70%)`;
  return { rotateX, rotateY, sheenBg };
}

/**
 * Touch-reactive, macOS-style dock. As a finger glides across, each icon lights
 * up in its own rainbow color (red on the right → blue on the left) with a glow
 * that follows the finger and fades back to a plain outline behind it. Lifting
 * snaps to the nearest icon, illuminates it, and navigates there. The currently
 * active page stays illuminated at rest.
 */
export function BottomNav() {
  const mouseX = useMotionValue(Infinity);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { dockColor, dockFx } = useApp();
  const theme = dockColorTheme(dockColor);
  const fx = dockFxStyle(dockFx).id;
  const rowRef = useRef<HTMLDivElement>(null);
  const downXRef = useRef(0);
  const movedRef = useRef(false);
  const { rotateX, rotateY, sheenBg } = useGyroTilt();

  function nearestTo(clientX: number): string | null {
    const row = rowRef.current;
    if (!row) return null;
    const btns = Array.from(
      row.querySelectorAll<HTMLElement>("[data-dock-item]")
    );
    let best = -1;
    let bestDist = Infinity;
    btns.forEach((b, i) => {
      const r = b.getBoundingClientRect();
      const d = Math.abs(clientX - (r.left + r.width / 2));
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best >= 0 ? ITEMS[best].to : null;
  }

  return (
    <nav
      className="relative z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
      style={{ perspective: 700 }}
    >
      <motion.div
        ref={rowRef}
        style={
          reduceMotion
            ? undefined
            : { rotateX, rotateY, transformPerspective: 700 }
        }
        onPointerDown={(e) => {
          downXRef.current = e.clientX;
          movedRef.current = false;
          mouseX.set(e.clientX);
        }}
        onPointerMove={(e) => {
          // Desktop hover OR an active touch/drag both illuminate.
          if (Math.abs(e.clientX - downXRef.current) > 4) movedRef.current = true;
          mouseX.set(e.clientX);
        }}
        onPointerUp={(e) => {
          mouseX.set(Infinity);
          // A glide selects the nearest icon on lift; a plain tap is handled by
          // the button's onClick below.
          if (movedRef.current) {
            const to = nearestTo(e.clientX);
            if (to) {
              haptic(10);
              playSound("tap");
              navigate(to);
            }
          }
        }}
        onPointerLeave={() => mouseX.set(Infinity)}
        onPointerCancel={() => mouseX.set(Infinity)}
        className="glass relative mx-auto flex h-[60px] max-w-md touch-none select-none items-end justify-around rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] px-2 pb-2.5 shadow-[0_10px_34px_-14px_rgba(0,0,0,0.95)]"
      >
        {/* Clipped glass layer (rounded) for the hairline + moving sheen, so the
            icons can magnify above the bar without being clipped. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
        >
          <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          {!reduceMotion && (
            <motion.span
              style={{ backgroundImage: sheenBg }}
              className="absolute inset-0"
            />
          )}
        </span>
        {ITEMS.map((item, i) => {
          const active =
            (item.end ? pathname === item.to : pathname.startsWith(item.to)) ||
            item.match.some((m) => pathname.startsWith(m));
          return (
            <DockItem
              key={item.to}
              item={item}
              color={dockColorAt(theme.colors, i, ITEMS.length)}
              fx={fx}
              mouseX={mouseX}
              active={active}
              onSelect={() => {
                // Suppress the click that follows a glide (handled on pointerup).
                if (movedRef.current) {
                  movedRef.current = false;
                  return;
                }
                haptic(10);
                playSound("tap");
                navigate(item.to);
              }}
            />
          );
        })}
      </motion.div>
    </nav>
  );
}

function DockItem({
  item,
  color,
  fx,
  mouseX,
  active,
  onSelect,
}: {
  item: (typeof ITEMS)[number];
  color: string;
  fx: string;
  mouseX: MotionValue<number>;
  active: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { label, icon: Icon } = item;

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return RANGE + 1;
    return val - (bounds.x + bounds.width / 2);
  });

  // Scale (transform) instead of width/height so the bar never reflows.
  const scaleSync = useTransform(distance, [-RANGE, 0, RANGE], [1, PEAK_SCALE, 1]);
  const scale = useSpring(scaleSync, { mass: 0.1, stiffness: 200, damping: 14 });

  // Proximity glow 0..1, eased; combined with the active-at-rest state so the
  // current page stays lit and others fade to a plain outline.
  const glowSync = useTransform(distance, [-GLOW_RANGE, 0, GLOW_RANGE], [0, 1, 0]);
  const glow = useSpring(glowSync, { mass: 0.1, stiffness: 220, damping: 18 });
  const lit = useTransform(glow, (v) => Math.max(v, active ? 1 : 0));

  // Effect-style tuning.
  const haloMul = fx === "neon" ? 0.8 : fx === "aura" ? 0.7 : 0.5;
  const showHalo = fx === "glow" || fx === "neon" || fx === "aura";
  const showSolid = fx === "solid";
  const halo = useTransform(lit, (v) => v * haloMul);
  const solidOpacity = useTransform(lit, (v) => v * 0.9);
  const shadow =
    fx === "neon"
      ? `drop-shadow(0 0 5px ${color}) drop-shadow(0 0 12px ${color})`
      : fx === "minimal"
        ? "none"
        : `drop-shadow(0 0 7px ${color})`;

  return (
    <button
      type="button"
      data-dock-item
      aria-label={label}
      onClick={onSelect}
      className="flex flex-1 flex-col items-center outline-none"
    >
      <motion.div
        ref={ref}
        style={
          reduceMotion
            ? { width: BASE, height: BASE }
            : { width: BASE, height: BASE, scale, transformOrigin: "bottom center" }
        }
        className="relative flex items-center justify-center"
      >
        {/* Colored glow halo (glow / neon / aura). */}
        {showHalo && (
          <motion.span
            aria-hidden
            style={{ opacity: halo, background: color }}
            className={cx(
              "pointer-events-none absolute rounded-full",
              fx === "aura" ? "inset-0 blur-lg" : fx === "neon" ? "inset-1 blur-lg" : "inset-1.5 blur-md"
            )}
          />
        )}
        {/* Solid filled pill behind the icon (solid style). */}
        {showSolid && (
          <motion.span
            aria-hidden
            style={{ opacity: solidOpacity, background: color }}
            className="pointer-events-none absolute inset-1.5 rounded-2xl"
          />
        )}
        {/* Base outline icon. */}
        <Icon className="relative h-1/2 w-1/2 text-white/45" />
        {/* Lit icon (cross-fades in by proximity / active). For "solid" the icon
            sits on the colored pill, so it reads as dark ink; otherwise it takes
            the theme color with the chosen glow. */}
        <motion.span
          aria-hidden
          style={{ opacity: lit }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Icon
            className="h-1/2 w-1/2"
            style={
              showSolid
                ? { color: "#0a0b0f" }
                : { color, filter: shadow === "none" ? undefined : shadow }
            }
          />
        </motion.span>
      </motion.div>
    </button>
  );
}
