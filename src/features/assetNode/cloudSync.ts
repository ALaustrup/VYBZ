import { supabase } from "@/lib/supabase";
import type { CreatorNodeRecord, IndexedAssetRecord } from "@/features/assetNode/types";

const CHUNK = 200;

type NodeKind = "web" | "desktop" | "android" | "ios";

type CloudNodeRow = {
  id: string;
  name: string;
  kind: NodeKind;
  availability: CreatorNodeRecord["availability"];
  file_count: number;
  total_bytes: number;
  indexed_at: string;
};

type CloudAssetRow = {
  id: string;
  node_id: string;
  relative_path: string;
  name: string;
  mime: string;
  size_bytes: number;
  last_modified: string | null;
  availability: IndexedAssetRecord["availability"];
};

function nodeToRow(ownerId: string, node: CreatorNodeRecord, kind: NodeKind): Record<string, unknown> {
  return {
    id: node.id,
    owner_id: ownerId,
    name: node.name,
    kind,
    availability: node.availability,
    file_count: node.fileCount,
    total_bytes: node.totalBytes,
    indexed_at: new Date(node.indexedAt).toISOString(),
    last_seen_at: new Date().toISOString(),
  };
}

function assetToRow(ownerId: string, asset: IndexedAssetRecord): Record<string, unknown> {
  return {
    id: asset.id,
    node_id: asset.nodeId,
    owner_id: ownerId,
    relative_path: asset.relativePath,
    name: asset.name,
    mime: asset.mime,
    size_bytes: asset.sizeBytes,
    last_modified: asset.lastModified ? new Date(asset.lastModified).toISOString() : null,
    availability: asset.availability,
  };
}

export function cloudRowsHaveNoBytes(rows: Record<string, unknown>[]): boolean {
  const blob = JSON.stringify(rows);
  return !blob.includes('"url"') && !blob.includes("localPath") && !blob.includes("local_path") && !blob.includes("audio-assets");
}

/** Push metadata only. Never uploads file bytes. */
export async function pushIndexToCloud(
  ownerId: string,
  node: CreatorNodeRecord,
  assets: IndexedAssetRecord[],
  kind: NodeKind,
): Promise<void> {
  const sb = supabase;
  if (!sb) return;
  const nodeRow = nodeToRow(ownerId, node, kind);
  if (!cloudRowsHaveNoBytes([nodeRow, ...assets.map((a) => assetToRow(ownerId, a))])) {
    throw new Error("refusing to sync paths or urls");
  }
  const { error: nodeErr } = await sb.from("creator_nodes").upsert(nodeRow);
  if (nodeErr) throw nodeErr;
  const { error: delErr } = await sb.from("indexed_assets").delete().eq("node_id", node.id);
  if (delErr) throw delErr;
  for (let i = 0; i < assets.length; i += CHUNK) {
    const chunk = assets.slice(i, i + CHUNK).map((a) => assetToRow(ownerId, a));
    const { error } = await sb.from("indexed_assets").insert(chunk);
    if (error) throw error;
  }
}

export async function pullIndexFromCloud(): Promise<{
  nodes: CreatorNodeRecord[];
  assets: IndexedAssetRecord[];
}> {
  const sb = supabase;
  if (!sb) return { nodes: [], assets: [] };
  const [nodesRes, assetsRes] = await Promise.all([
    sb.from("creator_nodes").select("id,name,kind,availability,file_count,total_bytes,indexed_at"),
    sb.from("indexed_assets").select("id,node_id,relative_path,name,mime,size_bytes,last_modified,availability"),
  ]);
  if (nodesRes.error) throw nodesRes.error;
  if (assetsRes.error) throw assetsRes.error;
  const nodes = ((nodesRes.data ?? []) as CloudNodeRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    indexedAt: Date.parse(row.indexed_at) || 0,
    fileCount: row.file_count,
    totalBytes: Number(row.total_bytes) || 0,
    availability: row.availability,
    kind: row.kind,
  }));
  const assets = ((assetsRes.data ?? []) as CloudAssetRow[]).map((row) => ({
    id: row.id,
    nodeId: row.node_id,
    relativePath: row.relative_path,
    name: row.name,
    mime: row.mime,
    sizeBytes: Number(row.size_bytes) || 0,
    lastModified: row.last_modified ? Date.parse(row.last_modified) || 0 : 0,
    availability: row.availability,
  }));
  return { nodes, assets };
}

export async function deleteIndexFromCloud(nodeId: string): Promise<void> {
  const sb = supabase;
  if (!sb) return;
  const { error } = await sb.from("creator_nodes").delete().eq("id", nodeId);
  if (error) throw error;
}

export async function patchCloudAvailability(
  nodeId: string,
  availability: CreatorNodeRecord["availability"],
): Promise<void> {
  const sb = supabase;
  if (!sb) return;
  const { error: n } = await sb.from("creator_nodes").update({ availability, last_seen_at: new Date().toISOString() }).eq("id", nodeId);
  if (n) throw n;
  const { error: a } = await sb.from("indexed_assets").update({ availability }).eq("node_id", nodeId);
  if (a) throw a;
}
