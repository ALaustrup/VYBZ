import { useCallback, useEffect, useState } from "react";
import { FolderPlus, HardDrive, Loader2, Play, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PlatformError } from "@/platform/bridge";
import { usePlatform } from "@/platform/bridge/PlatformProvider";
import { useSession } from "@/store/session";
import { playTrack } from "@/lib/audioBus";
import { formatBytes } from "@/lib/repoSync";
import { cx } from "@/lib/utils";
import { AVAILABILITY_LABEL, MOBILE_AVAILABILITY_LEGEND } from "@/features/assetNode/types";
import { buildLocalIndex, isAudioAsset } from "@/features/assetNode/indexFolder";
import { listVisibleCatalog } from "@/features/assetNode/catalog";
import {
  deleteIndexFromCloud,
  patchCloudAvailability,
  pushIndexToCloud,
} from "@/features/assetNode/cloudSync";
import {
  markNodeAvailability,
  nodeHandle,
  rememberSessionBlobs,
  removeNode,
  saveIndex,
  sessionBlob,
} from "@/features/assetNode/store";
import { ensureDirectoryPermission, fileAtRelativePath, walkAuthorizedFolder } from "@/features/assetNode/walkHandle";
import type { CreatorNodeRecord, IndexedAssetRecord } from "@/features/assetNode/types";

/**
 * Local Asset Node catalog — authorized files on this device.
 * Indexing is not publishing. Originals stay on disk.
 */
export function LocalAssetsLibrary({ onChanged }: { onChanged?: () => void }) {
  const platform = usePlatform();
  const { userId, showToast } = useSession();
  const [nodes, setNodes] = useState<CreatorNodeRecord[]>([]);
  const [assets, setAssets] = useState<IndexedAssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const merged = await listVisibleCatalog();
    setNodes(merged.nodes);
    setAssets(merged.assets);
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
    setStatus("Waiting for folder…");
    try {
      const folder = await platform.files.selectFolder();
      if (!folder) {
        showToast("No folder selected.");
        return;
      }
      const handle = folder.directoryHandle as FileSystemDirectoryHandle | undefined;
      const picked = folder.files ?? [];
      if (handle) {
        setStatus("Indexing…");
        const allowed = await ensureDirectoryPermission(handle);
        if (!allowed) {
          showToast("Folder access was not granted.");
          return;
        }
        const walked = await walkAuthorizedFolder(handle, {
          onProgress: (count) => setStatus(`Indexing… ${count} files`),
        });
        if (walked.files.length === 0) {
          await refresh();
          showToast(
            walked.skipped > 0
              ? "Nothing cataloged. Backups, freeze, and processed caches are skipped."
              : "That folder had no files VYBZ can catalog.",
          );
          return;
        }
        const { node, assets: next } = buildLocalIndex(folder.name, walked.files);
        node.kind = platform.kind;
        setStatus("Saving index…");
        await saveIndex(node, next, handle);
        await refresh();
        onChanged?.();
        const extra = walked.truncated ? " Index stopped at the file cap." : "";
        showToast(`${next.length} files indexed as available now.${extra} Not published.`);
        if (userId) {
          void pushIndexToCloud(userId, node, next, platform.kind).catch(() => {
            showToast("Indexed on this device. Cloud catalog did not update.");
          });
        }
        return;
      }
      if (!picked.length) {
        showToast("No files were selected.");
        return;
      }
      const walked = picked.map((file) => ({
        relativePath: file.name,
        name: file.name,
        sizeBytes: file.sizeBytes,
        mime: file.mimeType,
        lastModified: file.lastModified ?? Date.now(),
      }));
      const { node, assets: next } = buildLocalIndex(folder.name, walked, Date.now(), () => crypto.randomUUID(), "session-only");
      node.kind = platform.kind;
      setStatus("Saving index…");
      await saveIndex(node, next);
      await rememberSessionBlobs(
        node.id,
        picked.map((file) => ({ relativePath: file.name, blob: file.blob })),
      );
      await refresh();
      onChanged?.();
      showToast(`${next.length} files indexed while this app is open. Not a background host. Not published.`);
      if (userId) {
        void pushIndexToCloud(userId, node, next, platform.kind).catch(() => {
          showToast("Indexed for this session. Cloud catalog did not update.");
        });
      }
    } catch (err) {
      if (err instanceof PlatformError && (err.code === "cancelled" || err.code === "unsupported")) {
        if (err.code === "unsupported") {
          showToast("This surface cannot index local files.");
        }
        return;
      }
      showToast("Could not index that folder.");
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  async function forget(nodeId: string) {
    await removeNode(nodeId);
    let cloudOk = true;
    try {
      await deleteIndexFromCloud(nodeId);
    } catch {
      cloudOk = false;
    }
    await refresh();
    onChanged?.();
    showToast(
      cloudOk
        ? "Removed from this device index. Files on disk were not deleted."
        : "Removed locally. Cloud catalog did not update.",
    );
  }

  async function play(asset: IndexedAssetRecord) {
    const live = sessionBlob(asset.nodeId, asset.relativePath);
    if (live) {
      const url = URL.createObjectURL(live);
      playTrack({
        id: asset.id,
        url,
        title: asset.name,
        artist: "This device",
      });
      return;
    }
    const handle = await nodeHandle(asset.nodeId);
    if (!handle) {
      const next = asset.availability === "session-only" ? "unavailable" : "device-offline";
      await markNodeAvailability(asset.nodeId, next);
      void patchCloudAvailability(asset.nodeId, next).catch(() => undefined);
      await refresh();
      showToast(
        next === "unavailable"
          ? "Those files were only available while the app was open. Index them again."
          : "That folder is not available on this device right now.",
      );
      return;
    }
    const allowed = await ensureDirectoryPermission(handle);
    if (!allowed) {
      await markNodeAvailability(asset.nodeId, "device-offline");
      void patchCloudAvailability(asset.nodeId, "device-offline").catch(() => undefined);
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

  const phone = platform.kind === "android" || platform.kind === "ios";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" data-testid="library-local-node">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] text-white/45" data-testid="node-honesty">
          {phone
            ? "Bytes stay on this phone while the app is open. vybz.cloud stores names and sizes only. Swarm is not this catalog. A phone is not a background host. Indexing is not publishing. Not published."
            : "Bytes stay on this device. vybz.cloud stores names and sizes only. Swarm is not this catalog. Indexing is not publishing. Not published."}
        </p>
        <button
          type="button"
          onClick={() => void indexFolder()}
          disabled={busy}
          className="forge-chip gap-1.5 px-3"
          data-testid="library-index-folder"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderPlus className="h-3.5 w-3.5" />}
          {phone ? "Index files" : "Index a folder"}
        </button>
      </div>
      {status ? (
        <p className="text-[12px] text-white/55" data-testid="library-index-status">
          {status}
        </p>
      ) : null}

      <ul className="grid gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-[11px] text-white/45" data-testid="availability-legend">
        {MOBILE_AVAILABILITY_LEGEND.map((row) => (
          <li key={row.id}>
            <span className="font-semibold uppercase tracking-wider text-white/55">{AVAILABILITY_LABEL[row.id]}</span>
            {" — "}
            {row.meaning}
          </li>
        ))}
      </ul>

      {assets.length === 0 ? (
        <EmptyState
          icon={HardDrive}
          title="Nothing indexed on this device"
          body="Choose a folder you control, or files on a phone. VYBZ catalogs names and sizes. Indexing is not publishing. Published works stay in Works."
          action={
            <button type="button" onClick={() => void indexFolder()} disabled={busy} className="forge-chip gap-1.5 px-3">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderPlus className="h-3.5 w-3.5" />}
              {busy ? status ?? "Indexing…" : phone ? "Index files" : "Index a folder"}
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
                      <span className="shrink-0 text-[11px] text-white/40">
                        {asset.sizeBytes > 0 ? formatBytes(asset.sizeBytes) : "—"}
                      </span>
                      { (asset.availability === "local-only" || asset.availability === "session-only") && isAudioAsset(asset.mime, asset.name) ? (
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
