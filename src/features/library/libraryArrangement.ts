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
  view: "cinema",
  sort: "newest",
  group: "none",
};

/** First gallery ship: people still on the old grid default land in cinema once. */
export const LIBRARY_GALLERY_BUMP = 2;

const PREFIX = "vybz.library.arrangement.";
const VIEWS: readonly LibraryView[] = ["cinema", "grid", "list", "table", "shelves"];

function keyFor(userId: string) {
  return `${PREFIX}${userId}`;
}

function parseView(value: unknown): LibraryView {
  return typeof value === "string" && (VIEWS as readonly string[]).includes(value)
    ? (value as LibraryView)
    : "cinema";
}

export function loadLibraryArrangement(userId: string | null | undefined): LibraryArrangement {
  if (!userId) return { ...DEFAULT_LIBRARY_ARRANGEMENT };
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return { ...DEFAULT_LIBRARY_ARRANGEMENT };
    const parsed = JSON.parse(raw) as Partial<LibraryArrangement> & { galleryBump?: number };
    let view = parseView(parsed.view);
    if ((parsed.galleryBump ?? 0) < LIBRARY_GALLERY_BUMP && view === "grid") {
      view = "cinema";
    }
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
    localStorage.setItem(
      keyFor(userId),
      JSON.stringify({ ...next, galleryBump: LIBRARY_GALLERY_BUMP }),
    );
  } catch {
    /* private mode / quota — arrangement stays in memory for this visit */
  }
}
