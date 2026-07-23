import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSession } from "@/store/session";
import { OrbSphere } from "@/components/taskbar/OrbSphere";
import { DEFAULT_ORB_ACTIONS, OrbFan, type OrbFanAction } from "@/components/taskbar/OrbFan";
import {
  PinCustomizeSheet,
  TaskbarCustomizeButton,
  TaskbarEditChrome,
  TaskbarPinRow,
  nearestPinSlot,
} from "@/components/taskbar/TaskbarPins";
import type { TaskbarPlacement } from "@/components/shell/AppChrome";
import {
  PIN_BY_ID,
  getTaskbarPins,
  reorderPin,
  setTaskbarPins,
  useTaskbarPins,
  type PinId,
  type PinSlot,
  type TaskbarPinsState,
} from "@/lib/taskbarPins";
import { cx } from "@/lib/utils";

/** Universal taskbar — edge page pins + center interactive orb (dock or desktop rail). */
export function Taskbar({
  onCompose,
  variant = "dock",
}: {
  onCompose: () => void;
  variant?: TaskbarPlacement;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { unread } = useSession();
  const saved = useTaskbarPins();
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TaskbarPinsState | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [drag, setDrag] = useState<{
    id: PinId;
    from: PinSlot;
    x: number;
    y: number;
  } | null>(null);
  const orbZoneRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const rail = variant === "rail";
  const pins = draft ?? saved;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open || editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (orbZoneRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => window.addEventListener("pointerdown", onPointer), 0);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open, editing]);

  useEffect(() => {
    if (!editing) return;
    setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") discardEdit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  function enterEdit(seed?: TaskbarPinsState) {
    const base = seed ?? getTaskbarPins();
    setDraft({ left: [...base.left], right: [...base.right] });
    setEditing(true);
    setOpen(false);
  }

  function discardEdit() {
    setEditing(false);
    setDraft(null);
    setDrag(null);
    setSheetOpen(false);
  }

  function finishEdit() {
    if (draft) setTaskbarPins(draft);
    setEditing(false);
    setDraft(null);
    setDrag(null);
    setSheetOpen(false);
  }

  function openCatalog() {
    if (!editing) {
      // Gear in normal mode: open sheet against saved pins
      setSheetOpen(true);
      return;
    }
    setSheetOpen(true);
  }

  function applyCatalog(next: TaskbarPinsState) {
    if (editing) {
      setDraft({ left: [...next.left], right: [...next.right] });
    } else {
      setTaskbarPins(next);
    }
  }

  function onLongPressEnter(_slot: PinSlot) {
    enterEdit(getTaskbarPins());
  }

  function onDragStart(slot: PinSlot, point: { x: number; y: number }) {
    if (!draft) return;
    const id = draft[slot.side][slot.index];
    if (!id) return;
    setDrag({ id, from: slot, x: point.x, y: point.y });
  }

  function onDragMove(point: { x: number; y: number }) {
    setDrag((d) => (d ? { ...d, x: point.x, y: point.y } : null));
  }

  function onDragEnd(point: { x: number; y: number }) {
    setDrag((current) => {
      if (!current) return null;
      const target = nearestPinSlot(point.x, point.y, current.from);
      if (target && (target.side !== current.from.side || target.index !== current.from.index)) {
        setDraft((d) => (d ? reorderPin(d, current.from, target) : d));
      }
      return null;
    });
  }

  // Global pointer tracking while dragging (finger may leave the pin button).
  useEffect(() => {
    if (!drag || !editing) return;
    const move = (e: PointerEvent) => onDragMove({ x: e.clientX, y: e.clientY });
    const up = (e: PointerEvent) => onDragEnd({ x: e.clientX, y: e.clientY });
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!drag, editing, draft]);

  function toggleOrb() {
    if (editing) return;
    if (!open) {
      setFlash(true);
      window.setTimeout(() => setFlash(false), 220);
    }
    setOpen((v) => !v);
  }

  const actions: OrbFanAction[] = DEFAULT_ORB_ACTIONS.map((a) => ({
    ...a,
    run: () => {
      setOpen(false);
      if (a.id === "drop") onCompose();
      else if (a.id === "live") navigate("/live?go=1");
      else if (a.id === "spark") navigate("/spark");
      else if (a.id === "messages") navigate("/messages");
    },
  }));

  const ghost = drag ? PIN_BY_ID[drag.id] : null;

  const pinProps = {
    pathname,
    unread,
    orientation: (rail ? "vertical" : "horizontal") as "horizontal" | "vertical",
    editing,
    draft: pins,
    onLongPressEnter,
    draggingId: drag?.id ?? null,
    onDragStart,
  };

  return (
    <div
      className={cx(
        "group/taskbar relative z-40",
        rail
          ? "flex h-full w-full flex-col px-0 py-0"
          : "px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-0",
      )}
    >
      {editing && rail && <TaskbarEditChrome rail onDone={finishEdit} onAdd={openCatalog} />}

      <div
        ref={barRef}
        className={cx(
          "glass relative mx-auto items-center gap-1 px-2",
          rail
            ? "flex h-full w-full max-w-none flex-col rounded-[28px] py-3"
            : "flex h-[76px] w-full max-w-3xl rounded-[28px] sm:px-3",
          editing && "ring-1 ring-veil-400/35",
        )}
      >
        {editing && !rail && <TaskbarEditChrome rail={false} onDone={finishEdit} onAdd={openCatalog} />}
        {!editing && <TaskbarCustomizeButton rail={rail} onOpen={openCatalog} />}

        <TaskbarPinRow side="left" {...pinProps} />

        <div
          ref={orbZoneRef}
          className={cx(
            "relative z-10 flex shrink-0 items-center justify-center",
            rail ? "my-2 px-0 py-1" : "px-1",
            editing && "pointer-events-none opacity-40",
          )}
        >
          <OrbFan open={open && !editing} actions={actions} onClose={() => setOpen(false)} direction={rail ? "end" : "up"} />
          <OrbSphere open={open && !editing} flash={flash} onClick={toggleOrb} />
        </div>

        <TaskbarPinRow side="right" {...pinProps} />
      </div>

      <PinCustomizeSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        draft={editing ? draft : null}
        onApply={applyCatalog}
      />

      {ghost && drag && (
        <div
          className="pointer-events-none fixed z-[80] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-2xl border border-veil-400/40 bg-ink-900/90 text-white shadow-card backdrop-blur-md"
          style={{ left: drag.x, top: drag.y }}
        >
          <ghost.icon className="h-5 w-5 text-veil-200" />
        </div>
      )}
    </div>
  );
}
