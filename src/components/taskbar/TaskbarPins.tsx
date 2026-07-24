import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, Settings2, X } from "lucide-react";
import { useSession } from "@/store/session";
import {
  MAX_SIDE,
  PIN_BY_ID,
  catalogForRole,
  pinIsActive,
  setTaskbarPins,
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
  /** Flatten into parent flex for even spacing across the full bar. */
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
    >
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
              key={id}
              type="button"
              data-pin-slot={`${side}-${index}`}
              data-pin-id={id}
              aria-label={`Move ${pin.label}`}
              title={pin.label}
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
          try { navigator.vibrate?.(10); } catch { /* ignore */ }
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
        // Long-press customize on touch / right-click shouldn't open the browser menu.
        if (onLongPressEnter) e.preventDefault();
      }}
    >
      {children}
    </NavLink>
  );
}

export function TaskbarCustomizeButton({
  rail = false,
  onOpen,
}: {
  rail?: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      aria-label="Customize taskbar"
      onClick={onOpen}
      className={cx(
        "absolute z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-ink-900/85 text-white/55 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-veil-400/50",
        rail ? "right-1 top-1" : "-top-2.5 right-2",
      )}
    >
      <Settings2 className="h-3.5 w-3.5" />
    </button>
  );
}

export function TaskbarEditChrome({
  rail,
  onDone,
  onAdd,
}: {
  rail: boolean;
  onDone: () => void;
  onAdd: () => void;
}) {
  return (
    <div
      className={cx(
        "z-30 flex items-center gap-2",
        rail
          ? "mb-2 w-full justify-center px-1"
          : "absolute -top-10 left-1/2 flex -translate-x-1/2",
      )}
    >
      <button
        type="button"
        onClick={onAdd}
        className="flex h-8 items-center gap-1 rounded-full border border-white/12 bg-ink-900/90 px-3 text-[12px] font-semibold text-white/80 backdrop-blur-md"
      >
        <Plus className="h-3.5 w-3.5" /> Add
      </button>
      <button
        type="button"
        onClick={onDone}
        className="flex h-8 items-center gap-1 rounded-full border border-veil-400/40 bg-veil-500/25 px-3 text-[12px] font-semibold text-white backdrop-blur-md"
      >
        <Check className="h-3.5 w-3.5" /> Done
      </button>
    </div>
  );
}

export function PinCustomizeSheet({
  open,
  onClose,
  draft,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  /** When provided (edit mode), Save applies to draft instead of localStorage immediately. */
  draft?: TaskbarPinsState | null;
  onApply?: (next: TaskbarPinsState) => void;
}) {
  const { profile } = useSession();
  const saved = useTaskbarPins();
  const seed = draft ?? saved;
  const [left, setLeft] = useState<PinId[]>(seed.left);
  const [right, setRight] = useState<PinId[]>(seed.right);
  const catalog = useMemo(
    () =>
      catalogForRole({
        isMod: profile?.platformRole === "moderator" || profile?.platformRole === "admin" || profile?.isAdmin,
        isAdmin: !!(profile?.isAdmin || profile?.platformRole === "admin"),
      }),
    [profile],
  );

  useEffect(() => {
    if (!open) return;
    const s = draft ?? saved;
    setLeft([...s.left]);
    setRight([...s.right]);
  }, [open, draft, saved.left, saved.right]);

  function toggle(side: PinSide, id: PinId) {
    const set = side === "left" ? setLeft : setRight;
    const cur = side === "left" ? left : right;
    const other = side === "left" ? right : left;
    if (cur.includes(id)) {
      set(cur.filter((x) => x !== id));
      return;
    }
    if (cur.length >= MAX_SIDE) return;
    if (other.includes(id)) {
      if (side === "left") setRight(other.filter((x) => x !== id));
      else setLeft(other.filter((x) => x !== id));
    }
    set([...cur, id]);
  }

  function save() {
    const next = { left, right };
    if (onApply) onApply(next);
    else setTaskbarPins(next);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-900/95 p-5 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-card backdrop-blur-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-white">Customize taskbar</h2>
                <p className="text-[12px] text-white/45">
                  Up to {MAX_SIDE} pins per side. Hold a pin on the bar to rearrange.
                </p>
              </div>
              <button type="button" aria-label="Close" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full glass">
                <X className="h-4 w-4" />
              </button>
            </div>

            <SideEditor title="Left" ids={left} catalog={catalog} onToggle={(id) => toggle("left", id)} />
            <SideEditor title="Right" ids={right} catalog={catalog} onToggle={(id) => toggle("right", id)} />

            <button type="button" onClick={save} className="btn btn-primary mt-4 w-full py-3">
              <Check className="h-4 w-4" /> Save pins
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SideEditor({
  title,
  ids,
  catalog,
  onToggle,
}: {
  title: string;
  ids: PinId[];
  catalog: ReturnType<typeof catalogForRole>;
  onToggle: (id: PinId) => void;
}) {
  return (
    <div className="mb-4">
      <p className="eyebrow mb-2">{title} · {ids.length}/{MAX_SIDE}</p>
      <div className="flex flex-wrap gap-2">
        {catalog.map((p) => {
          const on = ids.includes(p.id);
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p.id)}
              className={cx(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
                on ? "border-veil-400/50 bg-veil-500/20 text-white" : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white/80",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
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
  // Snap radius ~ 72px
  if (bestDist > 72 * 72) return null;
  return best;
}
