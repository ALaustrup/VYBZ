import { NavLink } from "react-router-dom";
import { MessageSquare, Hash } from "lucide-react";
import { cx } from "@/lib/utils";

/** Shared switcher between Direct messages and community Rooms. */
export function ChatTabs({ active }: { active: "direct" | "rooms" }) {
  const tab = (to: string, label: string, Icon: typeof Hash, on: boolean) => (
    <NavLink to={to} className={cx(
      "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition",
      on ? "bg-veil-500/20 text-white ring-1 ring-veil-400/40" : "text-white/50 hover:text-white/80",
    )}>
      <Icon className="h-4 w-4" /> {label}
    </NavLink>
  );
  return (
    <div className="mx-4 mb-2 flex gap-1.5 rounded-2xl border border-white/8 bg-white/[0.02] p-1">
      {tab("/messages", "Direct", MessageSquare, active === "direct")}
      {tab("/rooms", "Rooms", Hash, active === "rooms")}
    </div>
  );
}
