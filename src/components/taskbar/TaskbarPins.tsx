import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Settings2, X } from "lucide-react";
import { useSession } from "@/store/session";
import {
  MAX_SIDE,
  PIN_BY_ID,
  catalogForRole,
  pinIsActive,
  setTaskbarPins,
  useTaskbarPins,
  type PinId,
} from "@/lib/taskbarPins";
import { cx } from "@/lib/utils";

export function TaskbarPinRow({
  side,
  pathname,
  unread,
}: {
  side: "left" | "right";
  pathname: string;
  unread: number;
}) {
  const pins = useTaskbarPins();
  const ids = pins[side];

  return (
    <div className={cx("flex min-w-0 flex-1 items-center gap-0.5", side === "right" && "justify-end")}>
      {ids.map((id) => {
        const pin = PIN_BY_ID[id];
        if (!pin) return null;
        const Icon = pin.icon;
        const active = pinIsActive(pin, pathname);
        const showBadge = pin.badgeUnread && unread > 0 && pathname !== "/activity";
        return (
          <NavLink
            key={id}
            to={pin.to}
            end={!!pin.end}
            aria-label={pin.label}
            className={cx(
              "relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 py-1 transition",
              active ? "text-white" : "text-white/45 hover:text-white/80",
            )}
          >
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
            <span className={cx("relative z-10 hidden text-[9px] font-semibold sm:block", active ? "text-white/90" : "text-white/40")}>
              {pin.label}
            </span>
          </NavLink>
        );
      })}
    </div>
  );
}

export function TaskbarCustomizeButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Customize taskbar"
        onClick={() => setOpen(true)}
        className="absolute -top-2 right-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-ink-900/80 text-white/40 opacity-0 transition hover:text-white/80 group-hover/taskbar:opacity-100 focus:opacity-100 sm:opacity-60"
      >
        <Settings2 className="h-3.5 w-3.5" />
      </button>
      <PinCustomizeSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function PinCustomizeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile } = useSession();
  const saved = useTaskbarPins();
  const [left, setLeft] = useState<PinId[]>(saved.left);
  const [right, setRight] = useState<PinId[]>(saved.right);
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
    setLeft([...saved.left]);
    setRight([...saved.right]);
  }, [open, saved.left, saved.right]);

  function toggle(side: "left" | "right", id: PinId) {
    const set = side === "left" ? setLeft : setRight;
    const cur = side === "left" ? left : right;
    const other = side === "left" ? right : left;
    if (cur.includes(id)) {
      set(cur.filter((x) => x !== id));
      return;
    }
    if (cur.length >= MAX_SIDE) return;
    // Remove from other side if present
    if (other.includes(id)) {
      if (side === "left") setRight(other.filter((x) => x !== id));
      else setLeft(other.filter((x) => x !== id));
    }
    set([...cur, id]);
  }

  function save() {
    setTaskbarPins({ left, right });
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
                <p className="text-[12px] text-white/45">Up to {MAX_SIDE} pins per side. Center orb stays for actions.</p>
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
