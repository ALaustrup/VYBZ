import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { LiveSource } from "@/lib/liveSession";

export type MessagePopoutOpenOpts = {
  call?: LiveSource;
};

interface MessagePopoutState {
  threadId: string | null;
  pendingCall: LiveSource | null;
  openThread: (threadId: string, opts?: MessagePopoutOpenOpts) => void;
  clearPendingCall: () => void;
  close: () => void;
}

const Ctx = createContext<MessagePopoutState | null>(null);

export function MessagePopoutProvider({ children }: { children: ReactNode }) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [pendingCall, setPendingCall] = useState<LiveSource | null>(null);
  const openThread = useCallback((id: string, opts?: MessagePopoutOpenOpts) => {
    setPendingCall(opts?.call ?? null);
    setThreadId(id);
  }, []);
  const clearPendingCall = useCallback(() => setPendingCall(null), []);
  const close = useCallback(() => {
    setThreadId(null);
    setPendingCall(null);
  }, []);
  const value = useMemo(
    () => ({ threadId, pendingCall, openThread, clearPendingCall, close }),
    [threadId, pendingCall, openThread, clearPendingCall, close],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMessagePopout() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMessagePopout requires MessagePopoutProvider");
  return ctx;
}
