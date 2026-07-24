/**
 * Music Repos local sync — walk a DAW project folder, hash files (SHA-256),
 * apply ignore rules, and prepare CAS entries for upload.
 */

export type RepoDawHint = "ableton" | "fl" | "logic" | "reaper" | "bitwig" | "cubase" | "other";

export interface RepoFileEntry {
  /** Relative POSIX path from project root. */
  path: string;
  hash: string;
  size: number;
  file: File;
  mime: string;
}

export interface RepoWalkProgress {
  scanned: number;
  kept: number;
  skipped: number;
  bytes: number;
}

export interface RepoWalkResult {
  entries: RepoFileEntry[];
  daw: RepoDawHint;
  skipped: number;
  totalBytes: number;
}

const SKIP_DIR_NAMES = new Set([
  "backup",
  "backups",
  "trash",
  ".trash",
  ".git",
  ".svn",
  "node_modules",
  "__macosx",
  "ableton project info",
  "desktop.ini",
]);

const SKIP_EXT = new Set([
  "asd", // Ableton analysis
  "pek", // peak
  "reapeaks",
  "ds_store",
  "tmp",
  "temp",
  "lnk",
]);

function normalizeRel(parts: string[]): string {
  return parts.map((p) => p.replace(/\\/g, "/")).filter(Boolean).join("/");
}

function shouldSkipDir(name: string): boolean {
  const n = name.toLowerCase();
  if (SKIP_DIR_NAMES.has(n)) return true;
  if (n.startsWith("backup")) return true;
  return false;
}

function shouldSkipFile(name: string): boolean {
  const lower = name.toLowerCase();
  if (lower === "desktop.ini" || lower === "thumbs.db" || lower.startsWith(".~")) return true;
  const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".") + 1) : "";
  return SKIP_EXT.has(ext);
}

export function detectDaw(rootName: string, fileNames: string[]): RepoDawHint {
  const joined = fileNames.join("\n").toLowerCase();
  const root = rootName.toLowerCase();
  if (joined.includes(".als") || root.includes("ableton") || joined.includes("samples/")) return "ableton";
  if (joined.includes(".flp") || root.includes("fl studio")) return "fl";
  if (joined.includes(".logicx") || joined.includes("projectdata")) return "logic";
  if (joined.includes(".rpp") || joined.includes(".rpp-bak")) return "reaper";
  if (joined.includes(".bwproject")) return "bitwig";
  if (joined.includes(".cpr")) return "cubase";
  return "other";
}

async function sha256Hex(file: Blob): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Walk a FileSystemDirectoryHandle (Chrome/Edge). */
export async function walkDirectoryHandle(
  root: FileSystemDirectoryHandle,
  onProgress?: (p: RepoWalkProgress) => void,
): Promise<RepoWalkResult> {
  const entries: RepoFileEntry[] = [];
  let scanned = 0;
  let skipped = 0;
  let bytes = 0;
  const names: string[] = [];

  async function walk(dir: FileSystemDirectoryHandle, prefix: string[]) {
    const iter = (dir as FileSystemDirectoryHandle & {
      entries: () => AsyncIterableIterator<[string, FileSystemHandle]>;
    }).entries();
    for await (const [name, handle] of iter) {
      if (handle.kind === "directory") {
        if (shouldSkipDir(name)) {
          skipped += 1;
          continue;
        }
        await walk(handle as FileSystemDirectoryHandle, [...prefix, name]);
        continue;
      }
      scanned += 1;
      if (shouldSkipFile(name)) {
        skipped += 1;
        onProgress?.({ scanned, kept: entries.length, skipped, bytes });
        continue;
      }
      const file = await (handle as FileSystemFileHandle).getFile();
      // Soft cap per file 500MB inside the 1GB bunny limit
      if (file.size > 500 * 1024 * 1024) {
        skipped += 1;
        onProgress?.({ scanned, kept: entries.length, skipped, bytes });
        continue;
      }
      const rel = normalizeRel([...prefix, name]);
      names.push(rel);
      const hash = await sha256Hex(file);
      entries.push({
        path: rel,
        hash,
        size: file.size,
        file,
        mime: file.type || "application/octet-stream",
      });
      bytes += file.size;
      onProgress?.({ scanned, kept: entries.length, skipped, bytes });
    }
  }

  await walk(root, []);
  return {
    entries,
    daw: detectDaw(root.name, names),
    skipped,
    totalBytes: bytes,
  };
}

/** Walk files from a drag-drop DataTransfer (webkitdirectory / folder drop). */
export async function walkFileList(
  files: FileList | File[],
  onProgress?: (p: RepoWalkProgress) => void,
): Promise<RepoWalkResult> {
  const list = Array.from(files);
  const entries: RepoFileEntry[] = [];
  let scanned = 0;
  let skipped = 0;
  let bytes = 0;
  const names: string[] = [];
  let rootName = "project";

  for (const file of list) {
    const relRaw = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    const parts = relRaw.split(/[/\\]/).filter(Boolean);
    if (parts.length > 1) rootName = parts[0];
    const relParts = parts.length > 1 ? parts.slice(1) : parts;
    if (relParts.some((p) => shouldSkipDir(p))) {
      skipped += 1;
      continue;
    }
    const name = relParts[relParts.length - 1] ?? file.name;
    scanned += 1;
    if (shouldSkipFile(name)) {
      skipped += 1;
      onProgress?.({ scanned, kept: entries.length, skipped, bytes });
      continue;
    }
    if (file.size > 500 * 1024 * 1024) {
      skipped += 1;
      continue;
    }
    const rel = normalizeRel(relParts);
    names.push(rel);
    const hash = await sha256Hex(file);
    entries.push({
      path: rel,
      hash,
      size: file.size,
      file,
      mime: file.type || "application/octet-stream",
    });
    bytes += file.size;
    onProgress?.({ scanned, kept: entries.length, skipped, bytes });
  }

  return {
    entries,
    daw: detectDaw(rootName, names),
    skipped,
    totalBytes: bytes,
  };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export const DAW_LABEL: Record<RepoDawHint, string> = {
  ableton: "Ableton Live",
  fl: "FL Studio",
  logic: "Logic Pro",
  reaper: "REAPER",
  bitwig: "Bitwig",
  cubase: "Cubase",
  other: "DAW project",
};
