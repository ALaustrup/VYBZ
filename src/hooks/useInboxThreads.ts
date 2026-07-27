import { useCallback, useEffect, useState } from "react";
import * as api from "@/lib/api";
import type { DmThread } from "@/types";

/** Shared inbox list for Profile Inbox + Messages — realtime + unread. */
export function useInboxThreads(limit = 50) {
  const [threads, setThreads] = useState<DmThread[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setThreads(await api.listInboxThreads(limit));
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    void load();
    const ch = api.subscribeInserts("dm_messages", undefined, () => void load(true));
    return () => api.unsubscribe(ch);
  }, [load]);

  return { threads, loading, reload: load };
}
