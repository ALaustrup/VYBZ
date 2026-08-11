/**
 * OR-041 — optional DAW project folder link tied to the song workspace track.
 * Local / session only. Law 1: detect from measured folder names — never claim Ableton sync.
 */

import { detectDaw, type RepoDawHint } from "@/lib/repoSync";

export type DawFolderLink = {
  folderName: string;
  dawHint: RepoDawHint;
  fileCount: number;
  hasAls: boolean;
  hasDawproject: boolean;
  linkedAt: number;
  /** Optional Library drop this link is associated with (when known). */
  dropId?: string;
};

const SKIP_DIRS = new Set([
  "backup",
  "backups",
  "trash",
  ".trash",
  ".git",
  "node_modules",
  "__macosx",
  "ableton project info",
]);

function shouldSkipDir(name: string): boolean {
  return SKIP_DIRS.has(name.toLowerCase());
}

/** Name-only walk — no hashes, no uploads (honest link, not Music Repos sync). */
export async function inspectDirectoryHandle(
  root: FileSystemDirectoryHandle,
): Promise<DawFolderLink> {
  const names: string[] = [];

  async function walk(dir: FileSystemDirectoryHandle, prefix: string[]) {
    const iter = (
      dir as FileSystemDirectoryHandle & {
        entries: () => AsyncIterableIterator<[string, FileSystemHandle]>;
      }
    ).entries();
    for await (const [name, handle] of iter) {
      if (handle.kind === "directory") {
        if (shouldSkipDir(name)) continue;
        await walk(handle as FileSystemDirectoryHandle, [...prefix, name]);
        continue;
      }
      const rel = [...prefix, name].join("/");
      names.push(rel);
      // Cap inspection so huge Collect All folders stay responsive.
      if (names.length >= 4000) return;
    }
  }

  await walk(root, []);
  const dawHint = detectDaw(root.name, names);
  const lower = names.map((n) => n.toLowerCase());
  return {
    folderName: root.name,
    dawHint,
    fileCount: names.length,
    hasAls: lower.some((n) => n.endsWith(".als")),
    hasDawproject: lower.some((n) => n.endsWith(".dawproject")),
    linkedAt: Date.now(),
  };
}

export function dawHintLabel(hint: RepoDawHint): string {
  switch (hint) {
    case "ableton":
      return "Ableton Live (detected)";
    case "fl":
      return "FL Studio (detected)";
    case "logic":
      return "Logic (detected)";
    case "reaper":
      return "REAPER (detected)";
    case "bitwig":
      return "Bitwig (detected)";
    case "cubase":
      return "Cubase (detected)";
    case "dawproject":
      return "DAWproject (detected)";
    default:
      return "DAW folder (generic)";
  }
}

export function directoryPickerAvailable(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function pickDawProjectFolder(): Promise<DawFolderLink | null> {
  const w = window as Window & {
    showDirectoryPicker?: (opts?: { mode?: string }) => Promise<FileSystemDirectoryHandle>;
  };
  if (!w.showDirectoryPicker) return null;
  const handle = await w.showDirectoryPicker({ mode: "read" });
  return inspectDirectoryHandle(handle);
}
