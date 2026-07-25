import { useMemo, useRef, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useSession } from "@/store/session";
import {
  MAX_LEFT,
  MAX_RIGHT,
  PIN_BY_ID,
  catalogForRole,
  pinIsActive,
  useTaskbarPins,
  type PinId,
  type PinSide,
  type PinSlot,
  type TaskbarPinsState,
} from "@/lib/taskbarPins";
import { cx } from "@/lib/utils";

const LONG_PRESS_MS = 450;
const MOVE_CANCEL_PX = 8;

export function TaskbarPinRow({
  side,
  pathname,
  unread,
  orientation = "horizontal",
  editing = false,
  draft,
  onLongPressEnter,
  draggingId,
  onDragStart,
  spread = false,
}: {
  side: PinSide;
  pathname: string;
  unread: number;
  orientation?: "horizontal" | "vertical";
  editing?: boolean;
  draft?: TaskbarPinsState;
  onLongPressEnter?: (slot: PinSlot) => void;
  draggingId?: PinId | null;
  onDragStart?: (slot: PinSlot, point: { x: number; y: number }) => void;
  spread?: boolean;
}) {
  const saved = useTaskbarPins();
  const ids = (draft ?? saved)[side];
  const vertical = orientation === "vertical";
  const max = side === "left" ? MAX_LEFT : MAX_RIGHT;

  return (
    <div
      className={cx(
        "flex min-w-0 items-center",
        spread && !vertical
          ? "h-full w-full justify-evenly"
          : cx(
              "gap-0.5",
              vertical
                ? cx("w-full flex-col", side === "left" ? "justify-start" : "justify-end")
                : cx(side === "left" ? "justify-end" : "justify-start"),
            ),
      )}
      data-taskbar-side={side}
      data-taskbar-drop={side}
    >
      {editing && ids.length === 0 && (
        <div
          data-pin-slot={`${side}-0`}
          data-pin-drop-empty={side}
          className="mx-1 flex h-full min-h-[44px] w-full flex-1 items-center justify-center rounded-2xl border border-dashed border-white/20 text-[10px] font-medium text-white/35"
        >
          Drop here · max {max}
        </div>
      )}
      {ids.map((id, index) => {
        const pin = PIN_BY_ID[id];
        if (!pin) return null;
        const Icon = pin.icon;
        const active = !editing && pinIsActive(pin, pathname);
        const showBadge = !editing && pin.badgeUnread && unread > 0 && pathname !== "/activity";
        const isDragging = draggingId === id;
        const slot: PinSlot = { side, index };

        const className = cx(
          "relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-2xl py-1 transition touch-none select-none",
          spread && !vertical ? "h-full min-w-0 flex-1 px-0.5" : "min-w-[44px] px-1.5",
          editing ? "taskbar-pin-jiggle text-white/80" : active ? "text-white" : "text-white/45 hover:text-white/80",
          isDragging && "opacity-30",
        );

        const inner = (
          <>
            {active && (
              <motion.span
                layoutId="taskbar-pin-active"
                className="absolute inset-0 rounded-2xl bg-veil-500/14 ring-1 ring-veil-400/35"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10">
              <Icon className={cx("h-[18px] w-[18px]", active && "text-veil-200")} />
              {showBadge && (
                <span className="absolute -right-2 -top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-wild px-0.5 text-[8px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </span>
            {!vertical && (
              <span className={cx("relative z-10 hidden text-[9px] font-semibold sm:block", active ? "text-white/90" : "text-white/40")}>
                {pin.label}
              </span>
            )}
          </>
        );

        if (editing) {
          return (
            <button
              key={`${side}-${id}-${index}`}
              type="button"
              data-pin-slot={`${side}-${index}`}
              data-pin-id={id}
              aria-label={`Move ${pin.label}`}
              title={`${pin.label} — drag to reorder, drag off to remove`}
              className={className}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                onDragStart?.(slot, { x: e.clientX, y: e.clientY });
              }}
            >
              {inner}
            </button>
          );
        }

        return (
          <PinNavItem
            key={id}
            to={pin.to}
            end={!!pin.end}
            label={pin.label}
            className={className}
            slot={slot}
            onLongPressEnter={onLongPressEnter}
          >
            {inner}
          </PinNavItem>
        );
      })}
    </div>
  );
}

function PinNavItem({
  to,
  end,
  label,
  className,
  slot,
  onLongPressEnter,
  children,
}: {
  to: string;
  end: boolean;
  label: string;
  className: string;
  slot: PinSlot;
  onLongPressEnter?: (slot: PinSlot) => void;
  children: ReactNode;
}) {
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const armed = useRef(false);

  function clear() {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    start.current = null;
    armed.current = false;
  }

  return (
    <NavLink
      to={to}
      end={end}
      aria-label={label}
      title={label}
      className={className}
      draggable={false}
      onPointerDown={(e) => {
        if (e.button !== 0 || !onLongPressEnter) return;
        start.current = { x: e.clientX, y: e.clientY };
        armed.current = false;
        timer.current = window.setTimeout(() => {
          armed.current = true;
          try { navigator.vibrate?.(12); } catch { /* ignore */ }
          onLongPressEnter(slot);
        }, LONG_PRESS_MS);
      }}
      onPointerMove={(e) => {
        if (!start.current || timer.current == null) return;
        const dx = e.clientX - start.current.x;
        const dy = e.clientY - start.current.y;
        if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) clear();
      }}
      onPointerUp={clear}
      onPointerCancel={clear}
      onClick={(e) => {
        if (armed.current) {
          e.preventDefault();
          armed.current = false;
        }
      }}
      onContextMenu={(e) => {
        if (onLongPressEnter) e.preventDefault();
      }}
    >
      {children}
    </NavLink>
  );
}

/** Edit-mode tray — full catalog; drag icons onto the taskbar. Orb stays fixed. */
export function TaskbarPinTray({
  open,
  draft,
  draggingId,
  onDone,
  onCatalogDragStart,
}: {
  open: boolean;
  draft: TaskbarPinsState | null;
  draggingId?: PinId | null;
  onDone: () => void;
  onCatalogDragStart: (id: PinId, point: { x: number; y: number }) => void;
}) {
  const { profile } = useSession();
  const catalog = useMemo(
    () =>
      catalogForRole({
        isMod: profile?.platformRole === "moderator" || profile?.platformRole === "admin" || profile?.isAdmin,
        isAdmin: !!(profile?.isAdmin || profile?.platformRole === "admin"),
      }),
    [profile],
  );
  const pinned = new Set([...(draft?.left ?? []), ...(draft?.right ?? [])]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="pointer-events-auto absolute bottom-[calc(100%+0.65rem)] left-1/2 z-40 w-[min(100vw-1rem,26rem)] -translate-x-1/2 overflow-hidden rounded-3xl border border-white/12 bg-ink-900/92 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
          data-taskbar-tray
        >
          <div className="flex items-start justify-between gap-3 border-b border-[var(--hairline)] px-4 py-3">
            <div className="min-w-0">
              <h2 className="font-display text-[15px] font-semibold text-white">Customize taskbar</h2>
              <p className="mt-0.5 text-[11px] leading-snug text-white/45">
                Drag onto left (max {MAX_LEFT}) or right (max {MAX_RIGHT}). Drag a pin off the bar to remove.
                Orb stays.
              </p>
            </div>
            <button
              type="button"
              onClick={onDone}
              className="flex h-8 shrink-0 items-center gap-1 rounded-full border border-veil-400/40 bg-veil-500/25 px-3 text-[12px] font-semibold text-white"
            >
              <Check className="h-3.5 w-3.5" /> Done
            </button>
          </div>
          <div className="no-scrollbar grid max-h-[42dvh] grid-cols-4 gap-2 overflow-y-auto p-3 sm:grid-cols-5">
            {catalog.map((p) => {
              const Icon = p.icon;
              const on = pinned.has(p.id);
              const dim = draggingId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  data-catalog-pin={p.id}
                  title={on ? `${p.label} (on bar)` : `Add ${p.label}`}
                  className={cx(
                    "flex flex-col items-center gap-1 rounded-2xl border px-1.5 py-2.5 touch-none select-none transition active:scale-95",
                    on
                      ? "border-veil-400/40 bg-veil-500/15 text-white"
                      : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white",
                    dim && "opacity-35",
                  )}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    e.preventDefault();
                    onCatalogDragStart(p.id, { x: e.clientX, y: e.clientY });
                  }}
                >
                  <Icon className="h-5 w-5" style={{ color: on ? undefined : undefined }} />
                  <span className="w-full truncate text-center text-[9px] font-semibold">{p.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Find nearest pin slot under/near a point (edit-mode snap target). */
export function nearestPinSlot(x: number, y: number, exclude?: PinSlot): PinSlot | null {
  const nodes = document.querySelectorAll<HTMLElement>("[data-pin-slot]");
  let best: PinSlot | null = null;
  let bestDist = Infinity;
  nodes.forEach((el) => {
    const key = el.dataset.pinSlot;
    if (!key) return;
    const [side, idxStr] = key.split("-") as [PinSide, string];
    const index = Number(idxStr);
    if (exclude && exclude.side === side && exclude.index === index) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const d = (cx - x) ** 2 + (cy - y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = { side, index };
    }
  });
  if (bestDist > 88 * 88) return null;
  return best;
}

/** Prefer a pin slot; else the left/right drop rail under the pointer. */
export function nearestDropTarget(
  x: number,
  y: number,
  exclude?: PinSlot,
): PinSlot | null {
  const slot = nearestPinSlot(x, y, exclude);
  if (slot) return slot;

  const sides = document.querySelectorAll<HTMLElement>("[data-taskbar-drop]");
  for (const el of sides) {
    const side = el.dataset.taskbarDrop as PinSide | undefined;
    if (!side) continue;
    const r = el.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top - 12 && y <= r.bottom + 12) {
      const count = el.querySelectorAll("[data-pin-id]").length;
      return { side, index: count };
    }
  }
  return null;
}

/** True if point is over the taskbar pin rails (not the catalog tray). */
export function pointOverTaskbar(x: number, y: number): boolean {
  const sides = document.querySelectorAll<HTMLElement>("[data-taskbar-drop]");
  for (const el of sides) {
    const r = el.getBoundingClientRect();
    if (x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 20 && y <= r.bottom + 20) {
      return true;
    }
  }
  return false;
}
