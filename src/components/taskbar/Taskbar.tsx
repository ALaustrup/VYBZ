import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSession } from "@/store/session";
import { GlobalPlayer } from "@/components/GlobalPlayer";
import { OrbSphere } from "@/components/taskbar/OrbSphere";
import { DEFAULT_ORB_ACTIONS, OrbFan, type OrbFanAction } from "@/components/taskbar/OrbFan";
import {
  PinCustomizeSheet,
  TaskbarCustomizeButton,
  TaskbarEditChrome,
  TaskbarPinRow,
  nearestPinSlot,
} from "@/components/taskbar/TaskbarPins";
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
import { usePlayer } from "@/lib/audioBus";
import { FLAGS } from "@/lib/flags";
import { cx } from "@/lib/utils";

/** Bottom-centered taskbar — pins + Orb + integrated player (mobile = desktop). */
export function Taskbar({ onCompose }: { onCompose: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { unread } = useSession();
  const { track } = usePlayer();
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
  const pins = draft ?? saved;
  const playing = !!track;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    // Reserve stage space under the fixed dock (player strip grows the dock).
    const root = document.documentElement;
    root.style.setProperty("--dock-reserve", playing ? "9.75rem" : "6.25rem");
    return () => {
      root.style.removeProperty("--dock-reserve");
    };
  }, [playing]);

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
      else if (a.id === "live") navigate(FLAGS.socialLive ? "/social?go=1" : "/live?go=1");
      else if (a.id === "spark") navigate("/spark");
      else if (a.id === "messages") navigate("/messages");
    },
  }));

  const ghost = drag ? PIN_BY_ID[drag.id] : null;

  const pinProps = {
    pathname,
    unread,
    orientation: "horizontal" as const,
    editing,
    draft: pins,
    onLongPressEnter,
    draggingId: drag?.id ?? null,
    onDragStart,
  };

  return (
    <div className="group/taskbar pointer-events-none flex w-full overflow-visible pb-[max(0.35rem,env(safe-area-inset-bottom))]">
      <div
        ref={barRef}
        className={cx(
          "pointer-events-auto glass relative mx-0 flex w-full max-w-none flex-col overflow-visible",
          "rounded-none border-x-0 border-b-0 border-transparent",
          "shadow-[0_18px_50px_-28px_rgba(0,0,0,0.95)]",
          editing && "ring-1 ring-veil-400/35",
        )}
      >
        {editing && <TaskbarEditChrome rail={false} onDone={finishEdit} onAdd={openCatalog} />}
        {!editing && <TaskbarCustomizeButton rail={false} onOpen={openCatalog} />}

        <GlobalPlayer />

        <div className="relative grid h-[72px] w-full grid-cols-[1fr_auto_1fr] items-stretch px-[max(0.15rem,env(safe-area-inset-left))] pr-[max(0.15rem,env(safe-area-inset-right))] sm:h-[76px]">
          <TaskbarPinRow side="left" {...pinProps} spread />

          <div
            ref={orbZoneRef}
            className={cx(
              "relative z-20 flex shrink-0 items-center justify-center overflow-visible px-1",
              editing && "pointer-events-none opacity-40",
            )}
          >
            <OrbFan open={open && !editing} actions={actions} onClose={() => setOpen(false)} direction="up" />
            <OrbSphere open={open && !editing} flash={flash} onClick={toggleOrb} />
          </div>

          <TaskbarPinRow side="right" {...pinProps} spread />
        </div>
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
