import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, MessageCircle, Sparkles, Volume2, VolumeX } from "lucide-react";
import { openCompanionChannel, type CompanionHandle } from "@/features/companion/companionChannel";
import {
  INITIAL_COMPANION_STATE,
  type CompanionFaderId,
  type CompanionState,
} from "@/features/companion/companionProtocol";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";

export function CompanionPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { showToast } = useSession();
  const [handle, setHandle] = useState<CompanionHandle | null>(null);
  const [state, setState] = useState<CompanionState>(INITIAL_COMPANION_STATE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const opened = openCompanionChannel({
      sessionId: id,
      role: "remote",
      deviceLabel: navigator.userAgent.includes("Android") ? "Android" : "Companion",
    });
    setHandle(opened);
    setReady(true);
    if (!opened) return undefined;
    const unsub = opened.subscribe((next) => setState(next));
    return () => {
      unsub();
      opened.close();
    };
  }, [id]);

  async function setFader(fid: CompanionFaderId, value: number) {
    if (!handle) return;
    await handle.send({ type: "fader", id: fid, value });
    setState((s) => ({ ...s, [fid]: value }));
  }

  async function toggleMute(fid: CompanionFaderId) {
    if (!handle) return;
    const muted = fid === "master" ? !state.masterMuted : !state.cueMuted;
    await handle.send({ type: "mute", id: fid, muted });
    setState((s) => (fid === "master" ? { ...s, masterMuted: muted } : { ...s, cueMuted: muted }));
  }

  async function fireSpark() {
    if (!handle) return;
    await handle.send({ type: "spark" });
    showToast("Spark sent to the stage");
  }

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-veil-300" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-ink-950 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(`/live/${id}`)}
          aria-label="Back to stage"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/5"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <p className="font-display text-base font-semibold text-white">Companion deck</p>
          <p className="text-[11px] text-white/40">
            {handle ? "Linked to the live session" : "Realtime plane not configured"}
          </p>
        </div>
      </div>

      <Fader
        label="Master"
        value={state.master}
        muted={state.masterMuted}
        disabled={!handle}
        onChange={(v) => void setFader("master", v)}
        onMute={() => void toggleMute("master")}
      />
      <Fader
        label="Cue"
        value={state.cue}
        muted={state.cueMuted}
        disabled={!handle}
        onChange={(v) => void setFader("cue", v)}
        onMute={() => void toggleMute("cue")}
      />

      <p className="mt-2 text-[11px] font-mono text-white/35">
        Lockstep position: {state.positionMs == null ? "Not measured" : `${(state.positionMs / 1000).toFixed(1)}s`}
      </p>
      <p className="mt-1 text-[11px] text-white/30">
        Faders update this deck and the host HUD. They do not change the published mix yet.
      </p>

      <div className="mt-auto grid grid-cols-2 gap-2 pt-6">
        <button
          type="button"
          disabled={!handle}
          onClick={() => void fireSpark()}
          className="btn btn-primary h-12 disabled:opacity-40"
        >
          <Sparkles className="h-4 w-4" /> Spark
        </button>
        <button
          type="button"
          onClick={() => navigate(`/live/${id}`)}
          className="btn btn-ghost h-12"
        >
          <MessageCircle className="h-4 w-4" /> Stage chat
        </button>
      </div>
    </div>
  );
}

function Fader({
  label,
  value,
  muted,
  disabled,
  onChange,
  onMute,
}: {
  label: string;
  value: number;
  muted: boolean;
  disabled: boolean;
  onChange: (value: number) => void;
  onMute: () => void;
}) {
  return (
    <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-white">{label}</p>
        <button
          type="button"
          onClick={onMute}
          disabled={disabled}
          className={cx(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            muted ? "bg-wild/20 text-wild" : "bg-white/5 text-white/50",
          )}
          aria-label={muted ? `Unmute ${label}` : `Mute ${label}`}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-cyan-300"
      />
      <p className="mt-1 text-right font-mono text-[10px] text-white/35">{Math.round(value * 100)}</p>
    </div>
  );
}
