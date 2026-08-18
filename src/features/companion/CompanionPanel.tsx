import { useEffect, useState } from "react";
import { Copy, Smartphone } from "lucide-react";
import { useSession } from "@/store/session";
import { openCompanionChannel, type CompanionHandle } from "./companionChannel";
import type { CompanionState } from "./companionProtocol";
import { INITIAL_COMPANION_STATE } from "./companionProtocol";

type CompanionPanelProps = {
  sessionId: string;
};

export function CompanionPanel({ sessionId }: CompanionPanelProps) {
  const { showToast } = useSession();
  const [state, setState] = useState<CompanionState>(INITIAL_COMPANION_STATE);
  const [linked, setLinked] = useState(false);

  useEffect(() => {
    const handle: CompanionHandle | null = openCompanionChannel({
      sessionId,
      role: "host",
      deviceLabel: "studio",
    });
    if (!handle) return undefined;
    const unsub = handle.subscribe((next, msg) => {
      setState(next);
      if (msg.type === "hello" && msg.role === "remote") setLinked(true);
    });
    return () => {
      unsub();
      handle.close();
    };
  }, [sessionId]);

  const href = `${window.location.origin}/live/${sessionId}/companion`;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/60">
          <Smartphone className="h-3.5 w-3.5 text-cyan-300" /> Companion
        </p>
        <span className="font-mono text-[10px] text-white/40">
          {state.remotes > 0 ? `${state.remotes} remote${state.remotes === 1 ? "" : "s"}` : linked ? "Linked" : "Waiting"}
        </span>
      </div>
      <p className="mb-2 text-[11px] text-white/40 leading-relaxed">
        Open this session on an Android phone or tablet to ride faders and chat while you produce.
      </p>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(href);
          showToast("Companion link copied");
        }}
        className="btn btn-ghost flex h-8 w-full items-center justify-center gap-1.5 py-0 text-[11px]"
      >
        <Copy className="h-3 w-3" /> Copy companion link
      </button>
    </div>
  );
}
