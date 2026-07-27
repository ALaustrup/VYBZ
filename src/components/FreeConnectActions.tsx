import { useState } from "react";
import { Loader2, MessageCircle, Mic, UserPlus, Video } from "lucide-react";
import * as api from "@/lib/api";
import { openFreeDm } from "@/lib/freeConnect";
import { useMessagePopout } from "@/lib/messagePopout";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";

type Variant = "card" | "bar" | "spark";

/** Free forever Message / Connect / voice / cam — never gated. */
export function FreeConnectActions({
  peerId,
  peerName,
  variant = "bar",
  className,
  onConnected,
}: {
  peerId: string;
  peerName?: string | null;
  variant?: Variant;
  className?: string;
  onConnected?: () => void;
}) {
  const { openThread } = useMessagePopout();
  const { showToast } = useSession();
  const [busy, setBusy] = useState<"msg" | "connect" | "mic" | "cam" | null>(null);
  const label = peerName ? `@${peerName}` : "them";

  async function message(call?: "mic" | "cam") {
    if (busy) return;
    setBusy(call ?? "msg");
    const ok = await openFreeDm(peerId, openThread, call ? { call } : undefined);
    setBusy(null);
    if (!ok) showToast("Couldn't open message");
    else if (call) showToast(`Starting ${call === "cam" ? "cam" : "voice"} with ${label} — free`);
  }

  async function connect() {
    if (busy) return;
    setBusy("connect");
    await api.connect(peerId);
    setBusy(null);
    showToast(`Connection sent to ${peerName ?? "them"}`);
    onConnected?.();
  }

  if (variant === "card") {
    return (
      <div className={cx("mt-2 flex flex-wrap gap-1.5", className)} onClick={(e) => e.stopPropagation()}>
        <button type="button" disabled={!!busy} onClick={() => void message()}
          className="inline-flex items-center gap-1 rounded-full bg-coral-500/90 px-2.5 py-1 text-[11px] font-semibold text-white active:scale-95 disabled:opacity-50">
          {busy === "msg" ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageCircle className="h-3 w-3" />}
          Message
        </button>
        <button type="button" disabled={!!busy} onClick={() => void connect()}
          className="inline-flex items-center gap-1 rounded-full bg-paper-900/8 px-2.5 py-1 text-[11px] font-semibold text-paper-900/70 active:scale-95 disabled:opacity-50">
          {busy === "connect" ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
          Connect
        </button>
      </div>
    );
  }

  if (variant === "spark") {
    return (
      <div className={cx("flex items-center justify-center gap-3", className)} onClick={(e) => e.stopPropagation()}>
        <button type="button" disabled={!!busy} onClick={() => void message()}
          aria-label="Message — free"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-ink-950/90 text-white shadow-card active:scale-90 disabled:opacity-50">
          {busy === "msg" ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
        </button>
        <button type="button" disabled={!!busy} onClick={() => void message("mic")}
          aria-label="Voice — free forever"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/85 active:scale-90 disabled:opacity-50">
          {busy === "mic" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
        </button>
        <button type="button" disabled={!!busy} onClick={() => void message("cam")}
          aria-label="Cam to cam — free forever"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-feel/40 bg-feel/20 text-feel active:scale-90 disabled:opacity-50">
          {busy === "cam" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
        </button>
      </div>
    );
  }

  return (
    <div className={cx("flex flex-wrap gap-2", className)}>
      <button type="button" disabled={!!busy} onClick={() => void connect()} className="btn btn-ghost flex-1">
        {busy === "connect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Connect
      </button>
      <button type="button" disabled={!!busy} onClick={() => void message()} className="btn btn-primary flex-1">
        {busy === "msg" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />} Message
      </button>
      <button type="button" disabled={!!busy} onClick={() => void message("mic")} aria-label="Voice call — free"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full glass text-white/70 active:scale-90 disabled:opacity-50">
        {busy === "mic" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
      </button>
      <button type="button" disabled={!!busy} onClick={() => void message("cam")} aria-label="Cam to cam — free"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full glass text-feel active:scale-90 disabled:opacity-50">
        {busy === "cam" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
      </button>
    </div>
  );
}
