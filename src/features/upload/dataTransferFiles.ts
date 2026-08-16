/**
 * Files out of a drop, including whole folders.
 *
 * `dataTransfer.files` is empty when a directory is dropped — the folder is not
 * a file, and the browser will not enumerate it for you. Reaching the tracks
 * inside means walking `webkitGetAsEntry`, which is why dropping an album
 * folder appeared to do nothing at all.
 *
 * Ordering is by path, so dropping an album queues its tracks in the order the
 * folder presents them rather than whatever order the reader happened to
 * return.
 */

/** A runaway drop (an entire drive) should stop, not hang the tab. */
export const MAX_DROPPED_FILES = 500;

/** How deep to walk. Deeper than an album folder with a disc subfolder is a mistake. */
export const MAX_DROP_DEPTH = 8;

interface DirectoryReaderLike {
  readEntries(ok: (entries: FileSystemEntry[]) => void, fail?: (err: unknown) => void): void;
}

interface DirectoryEntryLike extends FileSystemEntry {
  createReader(): DirectoryReaderLike;
}

interface FileEntryLike extends FileSystemEntry {
  file(ok: (file: File) => void, fail?: (err: unknown) => void): void;
}

/** macOS sidecars and dotfiles are never something a person meant to upload. */
function isNoise(name: string): boolean {
  return name.startsWith(".");
}

/**
 * Pull the entries out synchronously.
 *
 * `DataTransferItemList` is emptied as soon as the drop handler yields, so
 * every `webkitGetAsEntry` must happen before the first await. Callers get this
 * for free by calling `filesFromDataTransfer` directly in the handler.
 */
export function entriesFromDataTransfer(dt: DataTransfer | null | undefined): FileSystemEntry[] {
  const items = dt?.items;
  if (!items?.length) return [];
  const out: FileSystemEntry[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || item.kind !== "file") continue;
    const entry = item.webkitGetAsEntry?.();
    if (entry) out.push(entry);
  }
  return out;
}

/** One directory page at a time; readEntries stops at ~100 and must be re-read. */
function readPage(reader: DirectoryReaderLike): Promise<FileSystemEntry[]> {
  return new Promise((resolve) => {
    reader.readEntries(
      (entries) => resolve(entries ?? []),
      () => resolve([]),
    );
  });
}

function readFile(entry: FileEntryLike): Promise<File | null> {
  return new Promise((resolve) => {
    entry.file(
      (file) => resolve(file),
      () => resolve(null),
    );
  });
}

async function walk(entry: FileSystemEntry, depth: number, out: File[]): Promise<void> {
  if (out.length >= MAX_DROPPED_FILES) return;
  if (isNoise(entry.name)) return;

  if (entry.isFile) {
    const file = await readFile(entry as FileEntryLike);
    if (file) out.push(file);
    return;
  }

  if (!entry.isDirectory || depth >= MAX_DROP_DEPTH) return;
  const reader = (entry as DirectoryEntryLike).createReader();
  for (;;) {
    const page = await readPage(reader);
    if (!page.length) break;
    for (const child of page) {
      await walk(child, depth + 1, out);
      if (out.length >= MAX_DROPPED_FILES) return;
    }
  }
}

/** Sort by folder path so an album arrives in its own order. */
function byPath(a: File, b: File): number {
  const pa = (a as File & { webkitRelativePath?: string }).webkitRelativePath || a.name;
  const pb = (b as File & { webkitRelativePath?: string }).webkitRelativePath || b.name;
  return pa.localeCompare(pb, undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Every file in a drop, walking into folders.
 *
 * Must be called synchronously from the drop handler — see
 * `entriesFromDataTransfer`.
 */
export async function filesFromDataTransfer(
  dt: DataTransfer | null | undefined,
): Promise<File[]> {
  const entries = entriesFromDataTransfer(dt);
  const plain = dt?.files ? Array.from(dt.files) : [];

  // No entry API (or nothing to walk): the plain list is all there is.
  if (!entries.length) return plain.filter((f) => !isNoise(f.name));

  const out: File[] = [];
  for (const entry of entries) {
    await walk(entry, 0, out);
    if (out.length >= MAX_DROPPED_FILES) break;
  }

  // A browser that gave us entries but read nothing from them still dropped
  // something; fall back rather than swallowing the drop.
  if (!out.length) return plain.filter((f) => !isNoise(f.name));
  return out.sort(byPath);
}
