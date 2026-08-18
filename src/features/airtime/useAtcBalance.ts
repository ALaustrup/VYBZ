import { useEffect, useState } from "react";
import { useSession } from "@/store/session";
import { fetchAtcBalance, type AtcBalanceResponse } from "./atcApi";

const POLL_MS = 60_000;

/** Server-authoritative ATC. Null means the fetch failed — never invent a clock. */
export function useAtcBalance(): AtcBalanceResponse | null | undefined {
  const { userId } = useSession();
  const [balance, setBalance] = useState<AtcBalanceResponse | null | undefined>(undefined);

  useEffect(() => {
    if (!userId) {
      setBalance(undefined);
      return undefined;
    }
    let alive = true;

    const load = async () => {
      const next = await fetchAtcBalance();
      if (alive) setBalance(next);
    };

    void load();
    const id = window.setInterval(() => { void load(); }, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [userId]);

  return userId ? balance : undefined;
}
