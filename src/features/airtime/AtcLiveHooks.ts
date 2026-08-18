import { useEffect, useRef, useState } from "react";
import { ATC_POLICY } from "@/product/invariants";
import type { AtcBalances } from "./atcAccounting";
import { recordDeclaredSignals } from "@/features/provenance/provenanceApi";
import { takeHostSignalSnapshot } from "@/features/provenance/hostSignals";
import { leftoverPlaySeconds, planAfterBurn } from "./atcHostGate";
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
  signalInputs?: () => { dawStreaming: boolean; micTrackLive: boolean };
  onBalances?: (b: AtcBalances & { total: number }) => void;
  onExhausted?: () => void;
  onWarn?: (total: number) => void;
}): void {
  const warned = useRef(false);
  const signalRef = useRef(opts.signalInputs);
  signalRef.current = opts.signalInputs;

  useEffect(() => {
    if (!opts.enabled) return undefined;
    let cancelled = false;
    let timer = 0;

    const signals = () => {
      const extras = signalRef.current?.() ?? { dawStreaming: false, micTrackLive: false };
      const focused = typeof document === "undefined" ? false : document.visibilityState === "visible";
      void recordDeclaredSignals(
        opts.sessionId,
        takeHostSignalSnapshot({ ...extras, focused }),
      ).catch(() => false);
    };

    const finish = () => {
      if (!cancelled) opts.onExhausted?.();
    };

    const playLeftover = async (seconds: number) => {
      if (seconds >= 1) {
        const last = await consumeHostAirtime(opts.sessionId, seconds);
        if (cancelled) return;
        if (last) {
          opts.onBalances?.({
            dailyFreeRemaining: last.dailyFreeRemaining,
            earnedBalance: last.earnedBalance,
            total: last.total,
          });
        }
      }
      timer = window.setTimeout(finish, Math.max(1, seconds) * 1000);
    };

    const tick = async () => {
      const res = await consumeHostAirtime(opts.sessionId, ATC_POLICY.hostBurnChunkSeconds);
      if (cancelled || !res) return;
      signals();
      opts.onBalances?.({
        dailyFreeRemaining: res.dailyFreeRemaining,
        earnedBalance: res.earnedBalance,
        total: res.total,
      });
      if (res.ok && res.total <= ATC_POLICY.hostWarningRemainingAtc && !warned.current) {
        warned.current = true;
        opts.onWarn?.(res.total);
      }
      const plan = planAfterBurn({
        ok: res.ok,
        total: res.total,
        error: res.error,
      });
      if (plan === "end") {
        finish();
        return;
      }
      if (plan === "buffer") {
        const left = leftoverPlaySeconds(res.total);
        void playLeftover(left);
        return;
      }
      timer = window.setTimeout(() => { void tick(); }, BURN_MS);
    };

    void tick();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [opts.enabled, opts.sessionId]);
}
