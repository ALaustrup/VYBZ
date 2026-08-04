import { useLocation, useNavigate } from "react-router-dom";
import { cx } from "@/lib/utils";

const MODES = [
  { id: "matches", label: "Matches", to: "/connect" },
  { id: "jobs", label: "Jobs", to: "/opportunities" },
  { id: "search", label: "Search", to: "/discover" },
] as const;

/** Network sub-nav — Matches / Jobs / Search (Spark dating deck archived M2). */
export function NetworkModes() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <div className="mb-3 flex gap-5 overflow-x-auto border-b border-[var(--hairline)] px-1 pb-2.5">
      {MODES.map((m) => {
        const active =
          m.to === "/connect"
            ? pathname === "/connect"
            : pathname.startsWith(m.to);
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => navigate(m.to)}
            className={cx(
              "relative shrink-0 pb-0.5 text-[13px] font-medium transition",
              active ? "text-white" : "text-white/40 hover:text-white/70",
            )}
          >
            {m.label}
            {active && <span className="absolute inset-x-0 -bottom-2.5 h-px bg-veil-400/70" />}
          </button>
        );
      })}
    </div>
  );
}
