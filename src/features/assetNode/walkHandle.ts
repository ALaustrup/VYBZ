import { MAX_INDEX_DEPTH, MAX_INDEXED_FILES, mimeFromName, shouldIndexDir, shouldIndexFile } from "@/features/assetNode/indexFolder";
import { safeRelativePath } from "@/features/assetNode/safePath";
import type { WalkFile } from "@/features/assetNode/types";

type DirHandle = FileSystemDirectoryHandle & {
  entries?: () => AsyncIterableIterator<[string, FileSystemHandle]>;
  values?: () => AsyncIterableIterator<FileSystemHandle>;
  queryPermission?: (opts?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (opts?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
};

export const WALK_BUDGET_MS = 20_000;
export const PERMISSION_TIMEOUT_MS = 2500;

export type WalkOptions = {
  budgetMs?: number;
  onProgress?: (count: number) => void;
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function* iterateDirectory(
  dir: FileSystemDirectoryHandle,
): AsyncGenerator<[string, FileSystemHandle]> {
  const d = dir as DirHandle;
  if (typeof d.entries === "function") {
    try {
      for await (const pair of d.entries()) yield pair;
      return;
    } catch {
      /* Some shells expose entries() but throw when iterating. Fall through. */
    }
  }
  if (typeof d.values === "function") {
    for await (const handle of d.values()) yield [handle.name, handle];
    return;
  }
  const asyncIter = (d as unknown as AsyncIterable<unknown>)[Symbol.asyncIterator];
  if (typeof asyncIter === "function") {
    for await (const item of d as unknown as AsyncIterable<unknown>) {
      if (Array.isArray(item) && item.length >= 2) {
        yield item as [string, FileSystemHandle];
        continue;
      }
      if (item && typeof item === "object" && "name" in item) {
        const handle = item as FileSystemHandle;
        yield [handle.name, handle];
      }
    }
    return;
  }
  throw new Error("directory is not listable");
}

export async function ensureDirectoryPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const h = handle as DirHandle;
  try {
    const probe = (async () => {
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
    })();
    // A handle just returned by the picker is already authorized. Do not hang on queryPermission.
    return await withTimeout(probe, PERMISSION_TIMEOUT_MS, "permission timeout");
  } catch {
    return true;
  }
}

/**
 * Name-only walk. Does not call getFile, so OneDrive placeholders and open Ableton
 * files cannot stall the catalog. Size is filled later on play. Never file contents.
 * Originals stay on disk.
 */
export async function walkAuthorizedFolder(
  root: FileSystemDirectoryHandle,
  options: WalkOptions = {},
): Promise<{ files: WalkFile[]; skipped: number; truncated: boolean }> {
  const files: WalkFile[] = [];
  let skipped = 0;
  let truncated = false;
  const budgetMs = options.budgetMs ?? WALK_BUDGET_MS;
  const started = Date.now();

  async function walk(dir: FileSystemDirectoryHandle, prefix: string[], depth: number) {
    if (truncated) return;
    if (Date.now() - started > budgetMs) {
      truncated = true;
      return;
    }
    if (depth > MAX_INDEX_DEPTH) {
      skipped += 1;
      return;
    }
    for await (const [name, handle] of iterateDirectory(dir)) {
      if (truncated) return;
      if (Date.now() - started > budgetMs) {
        truncated = true;
        return;
      }
      const isDir =
        handle.kind === "directory" ||
        (handle.kind !== "file" && typeof (handle as FileSystemDirectoryHandle).getDirectoryHandle === "function");
      if (isDir) {
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
      const relativePath = safeRelativePath([...prefix, name].join("/"));
      if (!relativePath) {
        skipped += 1;
        continue;
      }
      if (files.length >= MAX_INDEXED_FILES) {
        truncated = true;
        return;
      }
      files.push({
        relativePath,
        name,
        sizeBytes: 0,
        mime: mimeFromName(name),
        lastModified: 0,
      });
      options.onProgress?.(files.length);
      if (files.length % 50 === 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  await walk(root, [], 0);
  return { files, skipped, truncated };
}

export async function fileAtRelativePath(
  root: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<File | null> {
  const safe = safeRelativePath(relativePath);
  if (!safe) return null;
  const parts = safe.split("/").filter(Boolean);
  if (!parts.length) return null;
  let dir = root;
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(parts[i]!);
  }
  const fileHandle = await dir.getFileHandle(parts[parts.length - 1]!);
  return fileHandle.getFile();
}
