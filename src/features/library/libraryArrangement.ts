import {
  GROUP_LABEL,
  SORT_LABEL,
  type LibraryGroup,
  type LibrarySort,
  type LibraryView,
} from "@/lib/libraryQuery";

export type LibraryArrangement = {
  view: LibraryView;
  sort: LibrarySort;
  group: LibraryGroup;
};

export const DEFAULT_LIBRARY_ARRANGEMENT: LibraryArrangement = {
  view: "grid",
  sort: "newest",
  group: "none",
};

const PREFIX = "vybz.library.arrangement.";

function keyFor(userId: string) {
  return `${PREFIX}${userId}`;
}

export function loadLibraryArrangement(userId: string | null | undefined): LibraryArrangement {
  if (!userId) return { ...DEFAULT_LIBRARY_ARRANGEMENT };
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return { ...DEFAULT_LIBRARY_ARRANGEMENT };
    const parsed = JSON.parse(raw) as Partial<LibraryArrangement>;
    const view: LibraryView =
      parsed.view === "list" || parsed.view === "table" || parsed.view === "shelves" || parsed.view === "grid"
        ? parsed.view
        : "grid";
    const sort = parsed.sort && parsed.sort in SORT_LABEL ? parsed.sort : "newest";
    const group = parsed.group && parsed.group in GROUP_LABEL ? parsed.group : "none";
    return { view, sort, group };
  } catch {
    return { ...DEFAULT_LIBRARY_ARRANGEMENT };
  }
}

export function saveLibraryArrangement(userId: string | null | undefined, next: LibraryArrangement) {
  if (!userId) return;
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(next));
  } catch {
    /* private mode / quota — arrangement stays in memory for this visit */
  }
}
