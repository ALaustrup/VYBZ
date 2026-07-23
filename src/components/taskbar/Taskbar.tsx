import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSession } from "@/store/session";
import { OrbSphere } from "@/components/taskbar/OrbSphere";
import { DEFAULT_ORB_ACTIONS, OrbFan, type OrbFanAction } from "@/components/taskbar/OrbFan";
import { TaskbarCustomizeButton, TaskbarPinRow } from "@/components/taskbar/TaskbarPins";
import type { TaskbarPlacement } from "@/components/shell/AppChrome";
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
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const orbZoneRef = useRef<HTMLDivElement>(null);
  const rail = variant === "rail";

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
    <div
      className={cx(
        "group/taskbar relative z-40",
        rail
          ? "flex h-full w-full flex-col px-0 py-0"
          : "px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-0",
      )}
    >
      <div
        className={cx(
          "glass relative mx-auto items-center gap-1 px-2",
          rail
            ? "flex h-full w-full max-w-none flex-col rounded-[28px] py-3"
            : "flex h-[76px] w-full max-w-3xl rounded-[28px] sm:px-3",
        )}
      >
        <TaskbarCustomizeButton rail={rail} />
        <TaskbarPinRow side="left" pathname={pathname} unread={unread} orientation={rail ? "vertical" : "horizontal"} />

        <div
          ref={orbZoneRef}
          className={cx(
            "relative z-10 flex shrink-0 items-center justify-center",
            rail ? "my-2 px-0 py-1" : "px-1",
          )}
        >
          <OrbFan open={open} actions={actions} onClose={() => setOpen(false)} direction={rail ? "end" : "up"} />
          <OrbSphere open={open} flash={flash} onClick={toggleOrb} />
        </div>

        <TaskbarPinRow side="right" pathname={pathname} unread={unread} orientation={rail ? "vertical" : "horizontal"} />
      </div>
    </div>
  );
}
