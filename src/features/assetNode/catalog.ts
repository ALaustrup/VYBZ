import type { CreatorNodeRecord, IndexedAssetRecord } from "@/features/assetNode/types";
import { pullIndexFromCloud } from "@/features/assetNode/cloudSync";
import { listAssets, listNodes } from "@/features/assetNode/store";

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

export async function listVisibleCatalog(): Promise<{
  nodes: CreatorNodeRecord[];
  assets: IndexedAssetRecord[];
}> {
  const [localNodes, localAssets, cloud] = await Promise.all([
    listNodes(),
    listAssets(),
    pullIndexFromCloud().catch(() => ({ nodes: [] as CreatorNodeRecord[], assets: [] as IndexedAssetRecord[] })),
  ]);
  return mergeCatalog({ nodes: localNodes, assets: localAssets }, cloud);
}
