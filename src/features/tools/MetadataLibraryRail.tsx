/**
 * Your library, as a rail across the top of the editor.
 *
 * Albums first, because the common job is fixing a release rather than one
 * track. Picking an album opens every track in it; picking a single opens one.
 */
import { useEffect, useMemo, useState } from "react";
import { Disc3, Loader2, Music2 } from "lucide-react";
import * as api from "@/lib/api";
import { groupDrops, type DropGroup } from "@/lib/libraryQuery";
import { cx } from "@/lib/utils";
import type { Drop } from "@/types";

/** One page is enough to browse; the editor is not a catalogue manager. */
const LIBRARY_PAGE = 100;

export interface LibrarySelection {
  key: string;
  label: string;
  drops: Drop[];
}

export function MetadataLibraryRail({
  ownerId,
  selectedKey,
  onSelect,
}: {
  ownerId: string | null | undefined;
  selectedKey: string | null;
  onSelect: (selection: LibrarySelection) => void;
}) {
  const [drops, setDrops] = useState<Drop[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!ownerId) {
      setDrops([]);
      return;
    }
    void api
      .dropsBy(ownerId, LIBRARY_PAGE)
      .then((rows) => {
        if (!cancelled) setDrops(rows);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setDrops([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  const groups: DropGroup[] = useMemo(() => {
    if (!drops?.length) return [];
    // Albums before singles: a release is the usual unit of this work.
    return groupDrops(drops, "album").sort((a, b) => {
      if (a.key === "__single") return 1;
      if (b.key === "__single") return -1;
      return a.label.localeCompare(b.label);
    });
  }, [drops]);

  if (drops === null) {
    return (
      <div className="flex items-center gap-2 px-1 py-4 text-[12px] text-white/40">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading your library…
      </div>
    );
  }

  if (failed) {
    return <p className="px-1 py-3 text-[12px] text-white/40">Couldn't load your library.</p>;
  }

  if (!groups.length) {
    return (
      <p className="px-1 py-3 text-[12px] text-white/40">
        Nothing in your library yet — upload a track, or drop a file below to draft tags for it.
      </p>
    );
  }

  return (
    <div data-testid="metadata-library-rail">
      <p className="nexus-eyebrow mb-2">Your library</p>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {groups.map((group) => {
          const isAlbum = group.key !== "__single";
          const active = selectedKey === group.key;
          return (
            <button
              key={group.key}
              type="button"
              onClick={() => onSelect({ key: group.key, label: group.label, drops: group.drops })}
              className={cx(
                "flex w-36 shrink-0 flex-col items-start gap-1 rounded-2xl border p-3 text-left transition",
                active
                  ? "border-veil-400/50 bg-veil-500/15"
                  : "border-[var(--hairline)] bg-white/[0.03] hover:border-white/20",
              )}
            >
              <span
                className={cx(
                  "forge-chip flex h-8 w-8",
                  active ? "text-[rgb(var(--accent-rgb))]" : "text-white/45",
                )}
              >
                {isAlbum ? <Disc3 className="h-4 w-4" /> : <Music2 className="h-4 w-4" />}
              </span>
              <span className="line-clamp-2 text-[12px] font-medium text-white/85">
                {group.label}
              </span>
              <span className="text-[11px] text-white/35">
                {group.drops.length} {group.drops.length === 1 ? "track" : "tracks"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
