import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSession } from "@/store/session";
import { OrbSphere } from "@/components/taskbar/OrbSphere";
import { DEFAULT_ORB_ACTIONS, OrbFan, type OrbFanAction } from "@/components/taskbar/OrbFan";
import { TaskbarCustomizeButton, TaskbarPinRow } from "@/components/taskbar/TaskbarPins";

/** Universal bottom taskbar — edge page pins + center interactive orb. */
export function Taskbar({ onCompose }: { onCompose: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { unread } = useSession();
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const orbZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  function toggleOrb() {
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

  return (
    <div className="group/taskbar relative z-40 px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-1">
      <div className="glass relative mx-auto flex h-[76px] w-full max-w-3xl items-center gap-1 rounded-[28px] px-2 sm:px-3">
        <TaskbarCustomizeButton />
        <TaskbarPinRow side="left" pathname={pathname} unread={unread} />

        <div ref={orbZoneRef} className="relative z-10 flex shrink-0 items-center justify-center px-1">
          <OrbFan open={open} actions={actions} onClose={() => setOpen(false)} />
          <OrbSphere open={open} flash={flash} onClick={toggleOrb} />
        </div>

        <TaskbarPinRow side="right" pathname={pathname} unread={unread} />
      </div>
    </div>
  );
}
