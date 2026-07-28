import { useEffect, useRef } from "react";
import {
  Phone, PhoneOff, PhoneIncoming, Mic, MicOff, Video, VideoOff,
  SwitchCamera, Volume2, Maximize2, Minimize2, Radio, Loader2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCamCall } from "@/lib/camCall";
import { CAM_COUNTDOWN_FROM } from "@/lib/liveSession";
import { cx } from "@/lib/utils";

/**
 * Global cam/voice overlay:
 * - Incoming ring: green/red phones + caller name
 * - Prep: self-cam adjust + countdown from 5s
 * - Live dual-cam viewport (landscape-friendly)
 * - Click outside expanded chrome → minimize to PiP
 */
export function CamCallOverlay() {
  const {
    session, peerName, layout, setLayout, volume, setVolume,
    ringingOut, incomingInvite, acceptIncoming, declineIncoming,
  } = useCamCall();

  const { state, source, stream, remoteStream, error, muted, camEnabled, prepRemainingSec } = session;
  const audioRef = useRef<HTMLAudioElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const showIncoming = !!incomingInvite || state === "incoming";
  const showPrep = state === "prep";
  const showActive =
    ringingOut
    || state === "calling"
    || state === "connecting"
    || state === "connected"
    || state === "ended"
    || showPrep;
  const visible = showIncoming || showActive;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (remoteStream) {
      el.srcObject = remoteStream;
      el.volume = volume;
      void el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [remoteStream, volume]);

  if (!visible) return null;

  const callerName = incomingInvite?.fromName ?? peerName;
  const isCam = (incomingInvite?.source ?? source) === "cam";
  const countdownVisible =
    showPrep && prepRemainingSec != null && prepRemainingSec <= CAM_COUNTDOWN_FROM && prepRemainingSec >= 1;
  const showLiveBadge = showPrep && prepRemainingSec != null && prepRemainingSec < 1;
  const dualLive = state === "connected" || state === "connecting";

  return (
    <AnimatePresence>
      {showIncoming && (
        <motion.div
          key="ring"
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          className="pointer-events-auto fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[90] flex justify-center px-4"
        >
          <div
            className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-white/15 bg-ink-950/95 px-4 py-3 shadow-card backdrop-blur-xl"
            data-dark-stage
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-feel/20 text-feel ring-1 ring-feel/40">
              <PhoneIncoming className="h-5 w-5 animate-pulse" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-semibold text-white">@{callerName}</p>
              <p className="text-[11px] text-white/45">
                {isCam ? "Cam-to-cam" : "Voice"} · free forever
              </p>
            </div>
            <button
              type="button"
              onClick={() => void acceptIncoming()}
              aria-label="Accept call"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-feel text-ink-950 shadow-[0_0_24px_-6px_rgba(0,214,143,0.7)] active:scale-90"
            >
              <Phone className="h-5 w-5 fill-current" />
            </button>
            <button
              type="button"
              onClick={declineIncoming}
              aria-label="Decline call"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-wild text-white shadow-[0_0_24px_-6px_rgba(255,80,80,0.55)] active:scale-90"
            >
              <PhoneOff className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      )}

      {showActive && !showIncoming && (
        <motion.div
          key="viewport"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cx(
            "pointer-events-none fixed z-[85]",
            layout === "expanded" ? "inset-0" : "bottom-[max(5.5rem,env(safe-area-inset-bottom))] right-3",
          )}
        >
          {layout === "expanded" && (
            <div
              className="pointer-events-auto absolute inset-0 bg-ink-950/55 backdrop-blur-[2px]"
              aria-hidden
              onClick={() => setLayout("minimized")}
            />
          )}

          <div
            ref={viewportRef}
            data-dark-stage
            className={cx(
              "pointer-events-auto overflow-hidden border border-white/15 bg-ink-950/95 shadow-card backdrop-blur-xl",
              layout === "expanded"
                ? "absolute inset-x-3 top-[max(3.5rem,env(safe-area-inset-top))] bottom-[max(5.5rem,env(safe-area-inset-bottom))] mx-auto flex max-w-3xl flex-col rounded-3xl landscape:inset-x-6 landscape:max-w-5xl"
                : "w-[min(42vw,11.5rem)] rounded-2xl",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={cx("flex items-center gap-2 border-b border-white/10", layout === "minimized" ? "px-2 py-1.5" : "px-3 py-2.5")}>
              <StatusDot state={state} ringingOut={ringingOut} />
              <div className="min-w-0 flex-1">
                <p className={cx("truncate font-display font-semibold text-white", layout === "minimized" ? "text-[11px]" : "text-sm")}>
                  {ringingOut || state === "calling"
                    ? `Calling @${peerName}…`
                    : showPrep
                      ? "Get set"
                      : state === "connecting"
                        ? "Connecting…"
                        : state === "ended"
                          ? "Call ended"
                          : `@${peerName}`}
                </p>
                {layout === "expanded" && (
                  <p className="text-[11px] text-white/40">
                    {isCam ? "Cam-to-cam" : source === "desktop" ? "Desktop audio" : "Voice"}
                    {" · "}
                    {layout === "expanded" ? "tap outside to minimize" : ""}
                  </p>
                )}
              </div>
              {layout === "expanded" ? (
                <button type="button" onClick={() => setLayout("minimized")} aria-label="Minimize"
                  className="rounded-full p-2 text-white/55 hover:bg-white/10 active:scale-90">
                  <Minimize2 className="h-4 w-4" />
                </button>
              ) : (
                <button type="button" onClick={() => setLayout("expanded")} aria-label="Expand"
                  className="rounded-full p-1.5 text-white/55 hover:bg-white/10 active:scale-90">
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button type="button" onClick={session.endCall} aria-label="End call"
                className={cx("rounded-full bg-wild/25 text-wild active:scale-90", layout === "minimized" ? "p-1.5" : "p-2")}>
                <PhoneOff className={layout === "minimized" ? "h-3.5 w-3.5" : "h-4 w-4"} />
              </button>
            </div>

            {error && layout === "expanded" && (
              <p className="px-3 py-1.5 text-[11px] text-amber-200/90">{error}</p>
            )}

            {/* Video stage */}
            {(isCam || showPrep) && (
              <div className={cx(
                "relative bg-black/50",
                layout === "minimized" ? "aspect-[3/4]" : "min-h-0 flex-1",
              )}>
                {showPrep && stream && (
                  <video
                    autoPlay muted playsInline
                    ref={(el) => { if (el && stream) el.srcObject = stream; }}
                    className="h-full w-full object-cover"
                    aria-label="Your camera"
                  />
                )}

                {dualLive && (
                  <div className={cx(
                    "grid h-full gap-1 p-1",
                    layout === "minimized" ? "grid-rows-2" : "grid-cols-1 landscape:grid-cols-2 sm:grid-cols-2",
                  )}>
                    <CamTile stream={stream} label="You" muted mirror />
                    <CamTile stream={remoteStream} label={`@${peerName}`} />
                  </div>
                )}

                {(ringingOut || state === "calling") && !showPrep && (
                  <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 text-white/50">
                    <Loader2 className="h-6 w-6 animate-spin text-veil-300" />
                    <p className="text-xs">Waiting for @{peerName}…</p>
                  </div>
                )}

                {/* Countdown + live badge */}
                {countdownVisible && (
                  <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
                    <span className="rounded-full bg-ink-950/70 px-3 py-1 font-display text-lg font-bold tabular-nums text-white ring-1 ring-white/20 backdrop-blur-md">
                      {prepRemainingSec}
                    </span>
                  </div>
                )}
                {showLiveBadge && (
                  <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-feel/25 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-feel ring-1 ring-feel/40 backdrop-blur-md">
                      <Radio className="h-3.5 w-3.5 animate-pulse" /> Live
                    </span>
                  </div>
                )}
                {showPrep && layout === "expanded" && (
                  <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2 px-3">
                    <p className="rounded-full bg-ink-950/65 px-3 py-1.5 text-[11px] text-white/70 backdrop-blur-md">
                      Adjust your framing
                    </p>
                    <button
                      type="button"
                      onClick={() => void session.finishPrep()}
                      className="rounded-full bg-feel/90 px-3 py-1.5 text-[11px] font-semibold text-ink-950 active:scale-95"
                    >
                      Ready
                    </button>
                  </div>
                )}
              </div>
            )}

            {!isCam && !showPrep && layout === "expanded" && (
              <div className="flex min-h-[6rem] flex-1 items-center justify-center text-white/45">
                {(ringingOut || state === "calling") && <Loader2 className="h-5 w-5 animate-spin" />}
                {state === "connected" && <Mic className="h-8 w-8 text-feel" />}
              </div>
            )}

            {/* Controls — always visible in viewport */}
            {layout === "expanded" && state !== "ended" && (
              <div className="space-y-2 border-t border-white/10 px-3 py-3">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Ctrl onClick={session.toggleMute} active={muted} label={muted ? "Unmute" : "Mute"}>
                    {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Ctrl>
                  {isCam && (
                    <>
                      <Ctrl onClick={session.toggleCam} active={!camEnabled} label={camEnabled ? "Cam off" : "Cam on"}>
                        {camEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                      </Ctrl>
                      <Ctrl onClick={() => void session.flipCamera()} label="Flip">
                        <SwitchCamera className="h-4 w-4" />
                      </Ctrl>
                    </>
                  )}
                  <Ctrl onClick={session.endCall} danger label="End">
                    <PhoneOff className="h-4 w-4" />
                  </Ctrl>
                </div>
                <label className="flex items-center gap-2 px-1 text-[11px] text-white/50">
                  <Volume2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="shrink-0">Audio</span>
                  <input
                    type="range"
                    min={0.35}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="h-1.5 w-full accent-feel"
                    aria-label="Call volume"
                  />
                </label>
                <p className="text-center text-[10px] text-white/30">
                  Tip: turn your phone sideways for the best cam view
                </p>
              </div>
            )}

            {layout === "minimized" && (
              <div className="flex items-center justify-around gap-1 border-t border-white/10 px-1 py-1">
                <button type="button" onClick={session.toggleMute} className="rounded-full p-1.5 text-white/70 active:scale-90" aria-label="Mute">
                  {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                </button>
                {isCam && (
                  <button type="button" onClick={session.toggleCam} className="rounded-full p-1.5 text-white/70 active:scale-90" aria-label="Camera">
                    {camEnabled ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
            )}
          </div>

          <audio ref={audioRef} autoPlay playsInline className="hidden" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatusDot({ state, ringingOut }: { state: string; ringingOut: boolean }) {
  const pulse = ringingOut || state === "calling" || state === "connecting" || state === "prep";
  return (
    <span className={cx(
      "h-2.5 w-2.5 shrink-0 rounded-full",
      state === "connected" ? "bg-feel" : pulse ? "animate-pulse bg-amber-400" : "bg-white/30",
    )} />
  );
}

function CamTile({
  stream, label, muted, mirror,
}: {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;
  mirror?: boolean;
}) {
  return (
    <div className="relative min-h-0 overflow-hidden rounded-xl bg-black/40">
      {stream ? (
        <video
          autoPlay
          playsInline
          muted={muted}
          ref={(el) => { if (el) el.srcObject = stream; }}
          className={cx("h-full w-full object-cover", mirror && "scale-x-[-1]")}
        />
      ) : (
        <div className="flex h-full min-h-[8rem] items-center justify-center text-white/25">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      <span className="absolute bottom-1.5 left-1.5 rounded-md bg-ink-950/65 px-1.5 py-0.5 text-[10px] font-semibold text-white/80 backdrop-blur-sm">
        {label}
      </span>
    </div>
  );
}

function Ctrl({
  children, onClick, label, active, danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold active:scale-95",
        danger ? "bg-wild/25 text-wild"
          : active ? "bg-white/20 text-white"
            : "bg-white/10 text-white/85",
      )}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
