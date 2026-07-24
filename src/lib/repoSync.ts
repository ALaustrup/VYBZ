/**
 * Music Repos local sync — walk a DAW project folder, hash files (SHA-256),
 * apply ignore rules, and prepare CAS entries for upload.
 */

export type RepoDawHint =
  | "ableton"
  | "fl"
  | "logic"
  | "reaper"
  | "bitwig"
  | "cubase"
  | "dawproject"
  | "other";

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

/** First-class interchange signals (R5) — never claim bit-perfect DAW merge. */
export interface RepoPackAnalysis {
  hasDawproject: boolean;
  dawprojectPaths: string[];
  stemPaths: string[];
  bouncePaths: string[];
  /** True when Stems/ or similar convention is present. */
  hasStemPack: boolean;
  hasBounce: boolean;
  /** Short, honest handoff hints for collaborators on other DAWs. */
  exportHints: string[];
}

export interface RepoWalkResult {
  entries: RepoFileEntry[];
  daw: RepoDawHint;
  skipped: number;
  totalBytes: number;
  pack: RepoPackAnalysis;
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

/** Convention folders treated as stem / export packs (case-insensitive first segment). */
const STEM_DIR_ROOTS = new Set([
  "stems",
  "stem",
  "stem pack",
  "stem packs",
  "exports",
  "export",
  "audio export",
  "audio exports",
]);

const BOUNCE_DIR_ROOTS = new Set([
  "bounces",
  "bounce",
  "rendered",
  "render",
  "mixdowns",
  "mixdown",
]);

const BOUNCE_NAME_RE =
  /(^|[_\-\s])(bounce|master|mixdown|print|stereo\s*mix|final\s*mix)([_\-\s.]|$)/i;
const AUDIO_EXT = new Set(["wav", "aiff", "aif", "flac", "mp3", "m4a", "ogg", "bwf"]);

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

function extOf(path: string): string {
  const base = path.toLowerCase().split("/").pop() ?? "";
  const i = base.lastIndexOf(".");
  return i >= 0 ? base.slice(i + 1) : "";
}

function isUnderStemDir(path: string): boolean {
  const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
  if (!parts.length) return false;
  const root = parts[0].toLowerCase();
  if (STEM_DIR_ROOTS.has(root)) return true;
  return parts.some((p, i) => i > 0 && STEM_DIR_ROOTS.has(p.toLowerCase()));
}

function isLikelyBounce(path: string): boolean {
  const lower = path.toLowerCase();
  const ext = extOf(lower);
  if (!AUDIO_EXT.has(ext)) return false;
  if (isUnderStemDir(path)) return false;
  const parts = lower.split("/").filter(Boolean);
  if (parts.some((p) => BOUNCE_DIR_ROOTS.has(p))) return true;
  const base = parts[parts.length - 1] ?? lower;
  return BOUNCE_NAME_RE.test(base);
}

export function detectDaw(rootName: string, fileNames: string[]): RepoDawHint {
  const joined = fileNames.join("\n").toLowerCase();
  const root = rootName.toLowerCase();
  if (joined.includes(".dawproject") || fileNames.some((f) => f.toLowerCase().endsWith(".dawproject"))) {
    return "dawproject";
  }
  if (joined.includes(".als") || root.includes("ableton") || joined.includes("samples/")) return "ableton";
  if (joined.includes(".flp") || root.includes("fl studio")) return "fl";
  if (joined.includes(".logicx") || joined.includes("projectdata")) return "logic";
  if (joined.includes(".rpp") || joined.includes(".rpp-bak")) return "reaper";
  if (joined.includes(".bwproject")) return "bitwig";
  if (joined.includes(".cpr")) return "cubase";
  return "other";
}

/** Classify stem packs, DAWproject, and bounce files from relative paths. */
export function analyzeRepoPack(paths: string[], daw?: RepoDawHint): RepoPackAnalysis {
  const dawprojectPaths = paths.filter((p) => p.toLowerCase().endsWith(".dawproject"));
  const stemPaths = paths.filter((p) => {
    if (!AUDIO_EXT.has(extOf(p))) return false;
    return isUnderStemDir(p);
  });
  const bouncePaths = paths.filter((p) => isLikelyBounce(p) && !isUnderStemDir(p));
  const hasDawproject = dawprojectPaths.length > 0;
  const hasStemPack = stemPaths.length > 0;
  const hasBounce = bouncePaths.length > 0;
  const hintDaw = daw ?? detectDaw("project", paths);

  const exportHints: string[] = [];
  if (hasDawproject) {
    exportHints.push(
      "DAWproject found — best open interchange for Bitwig/Studio One/Reaper and friends. Plugin fidelity still varies.",
    );
  }
  if (hasStemPack) {
    exportHints.push(
      `${stemPaths.length} stem file(s) under a Stems/Exports folder — collaborators can rebuild without your DAW session.`,
    );
  } else {
    exportHints.push(
      "Add a Stems/ (or Exports/) folder with dry stems before listing or inviting mixers — full DAW packs are best-effort only.",
    );
  }
  if (hasBounce) {
    exportHints.push("Stereo bounce detected — good preview for listeners who lack your plugins.");
  } else {
    exportHints.push(
      "Export a stereo bounce (WAV) into Bounces/ or name it *bounce* / *master* so the tip has a playable reference.",
    );
  }

  switch (hintDaw) {
    case "ableton":
      exportHints.push(
        "Ableton: File → Export Audio/Video (stems) or Collect All and Save before commit. We do not merge .als XML.",
      );
      break;
    case "fl":
      exportHints.push("FL Studio: File → Export → Wave file / Split mixer tracks into Stems/. .flp stays opaque.");
      break;
    case "logic":
      exportHints.push("Logic: File → Export → All Tracks as Audio Files into Stems/. Package .logicx as the session.");
      break;
    case "reaper":
      exportHints.push("REAPER: File → Render → stems, or save a .dawproject export beside the .rpp.");
      break;
    case "bitwig":
      exportHints.push("Bitwig: Export → Audio / DAWproject. Native .bwproject is Bitwig-only.");
      break;
    case "cubase":
      exportHints.push("Cubase: Export → Audio Mixdown (Channel Batch) into Stems/.");
      break;
    case "dawproject":
      exportHints.push(
        "Prefer keeping the .dawproject updated when you change arrangement — stems still help missing plugins.",
      );
      break;
    default:
      exportHints.push(
        "Cross-DAW handoff: commit Stems/ + bounce + optional .dawproject. Never assume bit-perfect session merge.",
      );
  }

  return {
    hasDawproject,
    dawprojectPaths,
    stemPaths,
    bouncePaths,
    hasStemPack,
    hasBounce,
    exportHints,
  };
}

/** Analyze paths from an already-walked tree (History UI). */
export function analyzeTreePaths(paths: string[]): RepoPackAnalysis {
  return analyzeRepoPack(paths);
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
  const daw = detectDaw(root.name, names);
  return {
    entries,
    daw,
    skipped,
    totalBytes: bytes,
    pack: analyzeRepoPack(names, daw),
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

  const daw = detectDaw(rootName, names);
  return {
    entries,
    daw,
    skipped,
    totalBytes: bytes,
    pack: analyzeRepoPack(names, daw),
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
  dawproject: "DAWproject",
  other: "DAW project",
};
