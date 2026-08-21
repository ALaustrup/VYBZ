import type { CreatorNodeRecord, IndexedAssetRecord } from "@/features/assetNode/types";
import { pullIndexFromCloud } from "@/features/assetNode/cloudSync";
import { hasSessionBlobs, listAssets, listNodes } from "@/features/assetNode/store";

export function mergeCatalog(
  local: { nodes: CreatorNodeRecord[]; assets: IndexedAssetRecord[] },
  cloud: { nodes: CreatorNodeRecord[]; assets: IndexedAssetRecord[] },
): { nodes: CreatorNodeRecord[]; assets: IndexedAssetRecord[] } {
  const localIds = new Set(local.nodes.map((n) => n.id));
  const remoteNodes = cloud.nodes
    .filter((n) => !localIds.has(n.id))
    .map((n) => ({ ...n, availability: "device-offline" as const }));
  const remoteAssets = cloud.assets
    .filter((a) => !localIds.has(a.nodeId))
    .map((a) => ({ ...a, availability: "device-offline" as const }));
  return {
    nodes: [...local.nodes, ...remoteNodes],
    assets: [...local.assets, ...remoteAssets],
  };
}

/** Session-only indexes lose bytes when the JS heap is gone. Do not pretend they are still playable. */
export function settleThisDeviceAvailability(
  node: CreatorNodeRecord,
  liveBytes: boolean,
): CreatorNodeRecord {
  if (node.availability === "session-only" && !liveBytes) {
    return { ...node, availability: "unavailable" };
  }
  return node;
}

export async function listVisibleCatalog(): Promise<{
  nodes: CreatorNodeRecord[];
  assets: IndexedAssetRecord[];
}> {
  const emptyCloud = { nodes: [] as CreatorNodeRecord[], assets: [] as IndexedAssetRecord[] };
  const [localNodes, localAssets, cloud] = await Promise.all([
    listNodes(),
    listAssets(),
    Promise.race([
      pullIndexFromCloud().catch(() => emptyCloud),
      new Promise<typeof emptyCloud>((resolve) => setTimeout(() => resolve(emptyCloud), 4000)),
    ]),
  ]);
  const settled = localNodes.map((n) => settleThisDeviceAvailability(n, hasSessionBlobs(n.id) || n.availability === "local-only"));
  const settledIds = new Map(settled.map((n) => [n.id, n.availability]));
  const settledAssets = localAssets.map((a) => {
    const next = settledIds.get(a.nodeId);
    return next && next !== a.availability ? { ...a, availability: next } : a;
  });
  return mergeCatalog({ nodes: settled, assets: settledAssets }, cloud);
}
