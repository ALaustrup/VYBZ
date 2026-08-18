import { useEffect, useRef, useState } from "react";
import { ATC_POLICY } from "@/product/invariants";
import type { AtcBalances } from "./atcAccounting";
import { consumeHostAirtime, reportListenHeartbeat } from "./atcApi";

const HEARTBEAT_MS = 15_000;
const BURN_MS = ATC_POLICY.hostBurnChunkSeconds * 1000;

export function useListenEarn(opts: {
  sessionId: string;
  enabled: boolean;
  playing: boolean;
  onAwarded?: (atc: number) => void;
}): number {
  const [credited, setCredited] = useState(0);
  const playingRef = useRef(opts.playing);
  playingRef.current = opts.playing;

  useEffect(() => {
    if (!opts.enabled) return undefined;
    let cancelled = false;

    const tick = async () => {
      const focused = typeof document === "undefined" ? true : document.visibilityState === "visible";
      const res = await reportListenHeartbeat(opts.sessionId, focused, playingRef.current);
      if (cancelled || !res) return;
      setCredited(res.creditedSeconds);
      if (res.awarded > 0) opts.onAwarded?.(res.awarded);
    };

    void tick();
    const id = window.setInterval(() => { void tick(); }, HEARTBEAT_MS);
    const onVis = () => { void tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [opts.enabled, opts.sessionId]);

  return credited;
}

export function useHostBurn(opts: {
  sessionId: string;
  enabled: boolean;
  onBalances?: (b: AtcBalances & { total: number }) => void;
  onExhausted?: () => void;
  onWarn?: (total: number) => void;
}): void {
  const warned = useRef(false);

  useEffect(() => {
    if (!opts.enabled) return undefined;
    let cancelled = false;

    const tick = async () => {
      const res = await consumeHostAirtime(opts.sessionId, ATC_POLICY.hostBurnChunkSeconds);
      if (cancelled || !res) return;
      opts.onBalances?.({
        dailyFreeRemaining: res.dailyFreeRemaining,
        earnedBalance: res.earnedBalance,
        total: res.total,
      });
      if (res.error === "insufficient" || (res.ok && res.total <= 0)) {
        opts.onExhausted?.();
        return;
      }
      if (res.ok && res.total <= ATC_POLICY.hostWarningRemainingAtc && !warned.current) {
        warned.current = true;
        opts.onWarn?.(res.total);
      }
    };

    const id = window.setInterval(() => { void tick(); }, BURN_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [opts.enabled, opts.sessionId]);
}
