import { useCallback, useEffect, useState } from "react";
import { FolderPlus, HardDrive, Loader2, Play, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PlatformError } from "@/platform/bridge";
import { usePlatform } from "@/platform/bridge/PlatformProvider";
import { useSession } from "@/store/session";
import { playTrack } from "@/lib/audioBus";
import { formatBytes } from "@/lib/repoSync";
import { cx } from "@/lib/utils";
import { AVAILABILITY_LABEL } from "@/features/assetNode/types";
import { buildLocalIndex, isAudioAsset } from "@/features/assetNode/indexFolder";
import {
  listAssets,
  listNodes,
  markNodeAvailability,
  nodeHandle,
  removeNode,
  saveIndex,
} from "@/features/assetNode/store";
import { ensureDirectoryPermission, fileAtRelativePath, walkAuthorizedFolder } from "@/features/assetNode/walkHandle";
import type { CreatorNodeRecord, IndexedAssetRecord } from "@/features/assetNode/types";

/**
 * Local Asset Node catalog — authorized files on this device.
 * Indexing is not publishing. Originals stay on disk.
 */
export function LocalAssetsLibrary({ onChanged }: { onChanged?: () => void }) {
  const platform = usePlatform();
  const { showToast } = useSession();
  const [nodes, setNodes] = useState<CreatorNodeRecord[]>([]);
  const [assets, setAssets] = useState<IndexedAssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [n, a] = await Promise.all([listNodes(), listAssets()]);
    setNodes(n);
    setAssets(a);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function indexFolder() {
    if (!platform.files.selectFolder) {
      showToast("This surface cannot index a folder yet.");
      return;
    }
    setBusy(true);
    try {
      const folder = await platform.files.selectFolder();
      if (!folder) return;
      const handle = folder.directoryHandle as FileSystemDirectoryHandle | undefined;
      if (!handle) {
        showToast("This browser cannot keep a local folder index. Use Chrome, Edge, or the desktop app.");
        return;
      }
      const allowed = await ensureDirectoryPermission(handle);
      if (!allowed) {
        showToast("Folder access was not granted.");
        return;
      }
      const walked = await walkAuthorizedFolder(handle);
      const { node, assets: next } = buildLocalIndex(folder.name, walked.files);
      await saveIndex(node, next, handle);
      await refresh();
      onChanged?.();
      const extra = walked.truncated ? " Index stopped at the file cap." : "";
      showToast(`${next.length} files indexed as local only.${extra} Not published.`);
    } catch (err) {
      if (err instanceof PlatformError && (err.code === "cancelled" || err.code === "unsupported")) {
        if (err.code === "unsupported") {
          showToast("This browser cannot index a folder. Use Chrome, Edge, or the desktop app.");
        }
        return;
      }
      showToast("Could not index that folder.");
    } finally {
      setBusy(false);
    }
  }

  async function forget(nodeId: string) {
    await removeNode(nodeId);
    await refresh();
    onChanged?.();
    showToast("Removed from this device index. Files on disk were not deleted.");
  }

  async function play(asset: IndexedAssetRecord) {
    const handle = await nodeHandle(asset.nodeId);
    if (!handle) {
      await markNodeAvailability(asset.nodeId, "device-offline");
      await refresh();
      showToast("That folder is not available on this device right now.");
      return;
    }
    const allowed = await ensureDirectoryPermission(handle);
    if (!allowed) {
      await markNodeAvailability(asset.nodeId, "device-offline");
      await refresh();
      showToast("Folder access is off. Index it again to restore.");
      return;
    }
    try {
      const file = await fileAtRelativePath(handle, asset.relativePath);
      if (!file) {
        showToast("That file is no longer in the folder.");
        return;
      }
      const url = URL.createObjectURL(file);
      playTrack({
        id: asset.id,
        url,
        title: asset.name,
        artist: "This device",
      });
    } catch {
      showToast("Could not open that local file.");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-[rgb(var(--app-accent-rgb))]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" data-testid="library-local-node">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] text-white/45">
          Indexed on this computer. Not published. Originals stay here.
        </p>
        <button
          type="button"
          onClick={() => void indexFolder()}
          disabled={busy}
          className="forge-chip gap-1.5 px-3"
          data-testid="library-index-folder"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderPlus className="h-3.5 w-3.5" />}
          Index a folder
        </button>
      </div>

      {assets.length === 0 ? (
        <EmptyState
          icon={HardDrive}
          title="Nothing indexed on this device"
          body="Choose a folder you control. VYBZ catalogs names and sizes only. Indexing is not publishing."
          action={
            <button type="button" onClick={() => void indexFolder()} className="forge-chip gap-1.5 px-3">
              <FolderPlus className="h-3.5 w-3.5" /> Index a folder
            </button>
          }
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-6">
          {nodes.map((node) => {
            const rows = assets.filter((a) => a.nodeId === node.id);
            return (
              <section key={node.id} className="space-y-2">
                <div className="flex items-center gap-2 px-0.5">
                  <HardDrive className="h-3.5 w-3.5 text-white/40" />
                  <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-white/85">{node.name}</p>
                  <span className="text-[10px] uppercase tracking-wider text-white/35">
                    {AVAILABILITY_LABEL[node.availability]}
                  </span>
                  <span className="text-[11px] text-white/35">
                    {node.fileCount} · {formatBytes(node.totalBytes)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void forget(node.id)}
                    className="forge-chip h-8 w-8"
                    aria-label={`Remove ${node.name} from index`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <ul className="divide-y divide-white/5 rounded-xl border border-white/8 bg-white/[0.03]">
                  {rows.map((asset) => (
                    <li key={asset.id} className="flex items-center gap-2 px-3 py-2">
                      <p className="min-w-0 flex-1 truncate text-[13px] text-white/90">{asset.relativePath}</p>
                      <span className="shrink-0 text-[10px] uppercase tracking-wider text-white/35">
                        {AVAILABILITY_LABEL[asset.availability]}
                      </span>
                      <span className="shrink-0 text-[11px] text-white/40">{formatBytes(asset.sizeBytes)}</span>
                      {isAudioAsset(asset.mime, asset.name) ? (
                        <button
                          type="button"
                          onClick={() => void play(asset)}
                          className={cx("forge-chip h-8 w-8")}
                          aria-label={`Play ${asset.name}`}
                        >
                          <Play className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
