import { MAX_INDEX_DEPTH, MAX_INDEXED_FILES, mimeFromName, shouldIndexDir, shouldIndexFile } from "@/features/assetNode/indexFolder";
import type { WalkFile } from "@/features/assetNode/types";

type DirHandle = FileSystemDirectoryHandle & {
  entries?: () => AsyncIterableIterator<[string, FileSystemHandle]>;
  queryPermission?: (opts?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (opts?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
};

export async function ensureDirectoryPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const h = handle as DirHandle;
  try {
    if (h.queryPermission) {
      const state = await h.queryPermission({ mode: "read" });
      if (state === "granted") return true;
      if (state === "denied") return false;
    }
    if (h.requestPermission) {
      const next = await h.requestPermission({ mode: "read" });
      return next === "granted";
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Metadata-only walk. Reads File.size / type / lastModified, never file contents.
 * Originals stay on disk.
 */
export async function walkAuthorizedFolder(
  root: FileSystemDirectoryHandle,
): Promise<{ files: WalkFile[]; skipped: number; truncated: boolean }> {
  const files: WalkFile[] = [];
  let skipped = 0;
  let truncated = false;

  async function walk(dir: FileSystemDirectoryHandle, prefix: string[], depth: number) {
    if (truncated) return;
    if (depth > MAX_INDEX_DEPTH) {
      skipped += 1;
      return;
    }
    const iter = (dir as DirHandle).entries?.();
    if (!iter) return;
    for await (const [name, handle] of iter) {
      if (truncated) return;
      if (handle.kind === "directory") {
        if (!shouldIndexDir(name)) {
          skipped += 1;
          continue;
        }
        await walk(handle as FileSystemDirectoryHandle, [...prefix, name], depth + 1);
        continue;
      }
      if (!shouldIndexFile(name)) {
        skipped += 1;
        continue;
      }
      if (files.length >= MAX_INDEXED_FILES) {
        truncated = true;
        return;
      }
      const file = await (handle as FileSystemFileHandle).getFile();
      files.push({
        relativePath: [...prefix, name].join("/"),
        name,
        sizeBytes: file.size,
        mime: mimeFromName(name, file.type),
        lastModified: file.lastModified,
      });
    }
  }

  await walk(root, [], 0);
  return { files, skipped, truncated };
}

export async function fileAtRelativePath(
  root: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<File | null> {
  const parts = relativePath.split("/").filter(Boolean);
  if (!parts.length) return null;
  let dir = root;
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(parts[i]!);
  }
  const fileHandle = await dir.getFileHandle(parts[parts.length - 1]!);
  return fileHandle.getFile();
}
