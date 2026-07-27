/** Open a free DM (and optional live call) — never paywalled. */
import * as api from "@/lib/api";
import type { MessagePopoutOpenOpts } from "@/lib/messagePopout";

export async function openFreeDm(
  peerId: string,
  openThread: (threadId: string, opts?: MessagePopoutOpenOpts) => void,
  opts?: MessagePopoutOpenOpts,
): Promise<boolean> {
  const threadId = await api.startDm(peerId);
  if (!threadId) return false;
  openThread(threadId, opts);
  return true;
}
