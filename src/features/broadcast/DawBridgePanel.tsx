/**
 * Producer-facing panel for the DAW master-bus link.
 * Connects to a plug-in already listening on loopback; does not invent meters.
 */
import { useEffect, useState } from "react";
import { Activity, Cable, Headphones, Loader2, Radio, Volume2, X } from "lucide-react";
import {
  getDawBridge,
  isDawBridgeRetained,
} from "@/features/broadcast/dawBridgeSession";
import type { DawInfo, DawMeterState, DawProtocolStatus, DawTransport } from "@/features/broadcast/pluginProtocol";
import { DEFAULT_DAW_WS_URL } from "@/features/broadcast/pluginProtocol";
import { cx } from "@/lib/utils";

type DawBridgePanelProps = {
  autoConnect?: boolean;
  onStreamReady?: (stream: MediaStream) => void;
  onDisconnect?: () => void;
  compact?: boolean;
  /** When false, the sheet owns teardown so step changes do not drop the link. */
  disconnectOnUnmount?: boolean;
};

export function DawBridgePanel({
  autoConnect = false,
  onStreamReady,
  onDisconnect,
  compact = false,
  disconnectOnUnmount = true,
}: DawBridgePanelProps) {
  const [status, setStatus] = useState<DawProtocolStatus>(() => getDawBridge().status);
  const [info, setInfo] = useState<DawInfo | null>(() => getDawBridge().info);
  const [meter, setMeter] = useState<DawMeterState | null>(() => getDawBridge().meter);
  const [transport, setTransport] = useState<DawTransport | null>(() => getDawBridge().transport);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const client = getDawBridge();
    setStatus(client.status);
    setInfo(client.info);
    setMeter(client.meter);

    const unsub = client.subscribe({
      onStatusChange: (s) => {
        setStatus(s);
        if (s === "disconnected") {
          setInfo(null);
          setMeter(null);
          setTransport(null);
          onDisconnect?.();
        }
      },
      onMeterUpdate: setMeter,
      onTransport: setTransport,
      onInfo: setInfo,
    });

    if (autoConnect && client.status === "disconnected") {
      void handleConnect();
    } else if (client.status === "connected" || client.status === "streaming") {
      const stream = client.getMediaStream();
      if (stream) onStreamReady?.(stream);
    }

    return () => {
      unsub();
      if (disconnectOnUnmount && !isDawBridgeRetained()) {
        client.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConnect() {
    const client = getDawBridge();
    setConnecting(true);
    const ok = await client.connect(DEFAULT_DAW_WS_URL);
    setConnecting(false);
    if (ok) {
      setInfo(client.info);
      const stream = client.getMediaStream();
      if (stream) onStreamReady?.(stream);
    }
  }

  function handleDisconnect() {
    getDawBridge().disconnect();
  }

  const isLive = status === "streaming";
  const isConnected = status === "connected" || isLive;

  return (
    <div
      className={cx(
        "rounded-2xl border backdrop-blur-md transition-all",
        isLive
          ? "border-emerald-400/30 bg-emerald-500/[0.06]"
          : isConnected
            ? "border-cyan-400/25 bg-cyan-500/[0.06]"
            : "border-white/10 bg-white/[0.03]",
        compact ? "p-3" : "p-4",
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span
            className={cx(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              isLive
                ? "bg-emerald-500/20 text-emerald-300"
                : isConnected
                  ? "bg-cyan-500/20 text-cyan-300"
                  : "bg-white/5 text-white/40",
            )}
          >
            <Cable className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold text-white">VLink</p>
            <p className="text-[10px] text-white/40 font-mono">
              {isLive ? "Streaming" : isConnected ? "Connected" : "Plug-in not connected"}
            </p>
          </div>
        </div>
        {isConnected ? (
          <button
            type="button"
            onClick={handleDisconnect}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-white/40 hover:text-white/80 transition"
            aria-label="Disconnect DAW"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleConnect()}
            disabled={connecting}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-white/8 px-3 text-[11px] font-semibold text-cyan-200 hover:bg-white/12 transition disabled:opacity-40"
          >
            {connecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Radio className="h-3 w-3" />}
            Connect
          </button>
        )}
      </div>

      {info && (
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 mb-2">
          <Headphones className="h-4 w-4 shrink-0 text-cyan-300" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white/90">
              {info.pluginName ? `${info.pluginName} · ${info.dawName}` : info.dawName}
            </p>
            <p className="text-[10px] font-mono text-white/40">
              {info.pluginFormat.toUpperCase()} · {info.sampleRate / 1000}kHz · {info.bufferSize} samples ·{" "}
              {info.latencyMs.toFixed(1)}ms
              {transport?.tempoBpm != null ? ` · ${transport.tempoBpm.toFixed(1)} BPM` : ""}
              {transport?.playing ? " · playing" : ""}
            </p>
          </div>
        </div>
      )}

      {isConnected && meter && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Volume2 className="h-3 w-3 text-white/30 shrink-0" />
            <div className="flex-1 space-y-1">
              <MeterBar label="L" peak={meter.peakL} rms={meter.rmsL} />
              <MeterBar label="R" peak={meter.peakR} rms={meter.rmsR} />
            </div>
          </div>
          <div className="flex items-center justify-between text-[9px] font-mono text-white/35">
            <span className="flex items-center gap-1">
              <Activity className="h-2.5 w-2.5 text-emerald-400" />
              {meter.lufsIntegrated.toFixed(1)} LU (mean-square)
            </span>
            <span>Peak {meter.truePeak.toFixed(1)} dBFS</span>
          </div>
        </div>
      )}

      {!isConnected && !compact && (
        <p className="mt-2 text-[10px] text-white/30 leading-relaxed">
          Insert <strong className="text-white/50">VLink</strong> on the master, then Connect.
          Source is in <span className="font-mono">native/vlink</span>. This panel talks to{" "}
          {DEFAULT_DAW_WS_URL.replace("ws://", "")}.
        </p>
      )}
    </div>
  );
}

function MeterBar({
  label,
  peak,
  rms,
}: {
  label: string;
  peak: number;
  rms: number;
}) {
  const pct = Math.min(100, Math.max(0, peak * 100));
  const rmsPct = Math.min(100, Math.max(0, rms * 100));
  const hot = peak > 0.95;

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 text-[8px] font-mono text-white/25">{label}</span>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white/15 transition-all duration-75"
          style={{ width: `${rmsPct}%` }}
        />
        <div
          className={cx(
            "absolute inset-y-0 left-0 rounded-full transition-all duration-75",
            hot
              ? "bg-gradient-to-r from-emerald-400 to-red-400"
              : "bg-gradient-to-r from-emerald-400 to-cyan-300",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
