import { useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, Check, Play, SearchX, Star } from "lucide-react";
import { TrackCard } from "@/components/TrackCard";
import { EmptyState } from "@/components/EmptyState";
import { LibraryToolbar } from "@/components/library/LibraryToolbar";
import { BatchActionBar } from "@/components/library/BatchActionBar";
import { LibraryRow } from "@/components/library/LibraryRow";
import {
  EMPTY_FILTERS,
  availableFacets,
  queryLibrary,
  type LibraryFilters,
  type LibraryGroup,
  type LibrarySort,
  type LibraryView,
} from "@/lib/libraryQuery";
import { useSelection } from "@/lib/useSelection";
import { useVirtualRows } from "@/lib/useVirtualRows";
import { cx } from "@/lib/utils";
import type { Drop } from "@/types";

const ROW_HEIGHT = { list: 64, table: 44 } as const;
/** Grid rows are two-up on >=sm; height covers the compact card plus its stats strip. */
const GRID_ROW_HEIGHT = 292;

export function UploadsLibrary({
  initialDrops,
  featuredId,
  onFeaturedChange,
}: {
  initialDrops: Drop[];
  featuredId?: string | null;
  onFeaturedChange?: () => void;
}) {
  const [drops, setDrops] = useState<Drop[]>(initialDrops);
  useEffect(() => {
    setDrops(initialDrops);
  }, [initialDrops]);

  const [filters, setFilters] = useState<LibraryFilters>({ ...EMPTY_FILTERS });
  const [sort, setSort] = useState<LibrarySort>("newest");
  const [group, setGroup] = useState<LibraryGroup>("none");
  const [view, setView] = useState<LibraryView>("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const facets = useMemo(() => availableFacets(drops), [drops]);
  const { total, matched, groups } = useMemo(
    () => queryLibrary(drops, filters, sort, group),
    [drops, filters, sort, group]
  );

  const selection = useSelection(useMemo(() => matched.map((d) => d.id), [matched]));

  function applyChange(change: {
    kind: "deleted" | "renamed" | "featured";
    dropId: string;
    title?: string;
  }) {
    if (change.kind === "deleted") {
      setDrops((l) => l.filter((x) => x.id !== change.dropId));
      selection.remove([change.dropId]);
      if (change.dropId === featuredId) onFeaturedChange?.();
      return;
    }
    if (change.kind === "renamed") {
      setDrops((l) =>
        l.map((x) => (x.id === change.dropId ? { ...x, title: change.title?.trim() || null } : x))
      );
      return;
    }
    onFeaturedChange?.();
  }

  function removeMany(ids: string[]) {
    const gone = new Set(ids);
    setDrops((l) => l.filter((x) => !gone.has(x.id)));
    selection.remove(ids);
    if (featuredId && gone.has(featuredId)) onFeaturedChange?.();
  }

  if (drops.length === 0) {
    return (
      <EmptyState
        icon={AudioLines}
        title="No drops yet"
        body="Share your first sound from the feed — it'll live here for you to manage."
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <LibraryToolbar
        filters={filters}
        onFilters={setFilters}
        sort={sort}
        onSort={setSort}
        group={group}
        onGroup={setGroup}
        view={view}
        onView={setView}
        facets={facets}
        matched={matched.length}
        total={total}
        filtersOpen={filtersOpen}
        onFiltersOpen={setFiltersOpen}
      />

      {matched.length > 0 && (
        <div className="flex items-center gap-2 text-[11px]">
          <button
            type="button"
            onClick={() => (selection.allVisibleSelected ? selection.clear() : selection.selectAll())}
            data-testid="library-select-all"
            className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1 font-semibold text-white/55 hover:text-white active:scale-95"
          >
            <span
              className={cx(
                "flex h-3.5 w-3.5 items-center justify-center rounded border",
                selection.allVisibleSelected
                  ? "border-transparent bg-[rgb(var(--accent-rgb))] text-black"
                  : "border-white/25"
              )}
              aria-hidden
            >
              {selection.allVisibleSelected && <Check className="h-2.5 w-2.5" />}
            </span>
            {selection.allVisibleSelected ? "Deselect all" : `Select all ${matched.length}`}
          </button>
          {selection.count > 0 && (
            <span className="font-mono text-white/35" data-testid="library-selected-count">
              {selection.count} selected
            </span>
          )}
        </div>
      )}

      {matched.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Nothing matches those filters"
          body="Try a different search term, or clear the filters to see your whole library."
        />
      ) : (
        <div ref={scrollRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto" data-testid="library-results">
          {groups.map((g) => (
            <section key={g.key} className="mb-4">
              {g.label && (
                <div className="sticky top-0 z-10 mb-2 flex items-center gap-2 bg-abyss-950/80 py-1.5 backdrop-blur">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{g.label}</h3>
                  <span className="font-mono text-[10px] text-white/25">{g.drops.length}</span>
                </div>
              )}
              <GroupBody
                drops={g.drops}
                view={view}
                scrollRef={scrollRef}
                featuredId={featuredId}
                selection={selection}
                onChanged={applyChange}
                virtualize={groups.length === 1}
              />
            </section>
          ))}
        </div>
      )}

      <BatchActionBar
        drops={matched}
        selectedIds={selection.visibleSelected}
        onClear={selection.clear}
        onDeleted={removeMany}
      />
    </div>
  );
}

type SelectionApi = ReturnType<typeof useSelection>;

function GroupBody({
  drops,
  view,
  scrollRef,
  featuredId,
  selection,
  onChanged,
  virtualize,
}: {
  drops: Drop[];
  view: LibraryView;
  scrollRef: React.RefObject<HTMLDivElement>;
  featuredId?: string | null;
  selection: SelectionApi;
  onChanged: (c: { kind: "deleted" | "renamed" | "featured"; dropId: string; title?: string }) => void;
  virtualize: boolean;
}) {
  const perRow = view === "grid" ? 2 : 1;
  const rowHeight = view === "grid" ? GRID_ROW_HEIGHT : ROW_HEIGHT[view];
  const rowCount = Math.ceil(drops.length / perRow);

  // Windowing only pays off past a screenful, and only when one group owns the scroller.
  const enabled = virtualize && rowCount > 24;
  const win = useVirtualRows({ count: rowCount, rowHeight, scrollRef, enabled });

  const rows: Drop[][] = [];
  for (let i = win.start; i < win.end; i++) {
    rows.push(drops.slice(i * perRow, i * perRow + perRow));
  }

  if (view === "table") {
    return (
      <div className="overflow-hidden rounded-xl border border-white/[0.07]">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2 border-b border-white/[0.07] bg-white/[0.03] px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">
          <span className="w-4" aria-hidden />
          <span>Title</span>
          <span className="hidden sm:block">Format</span>
          <span>Length</span>
          <span className="text-right">Plays</span>
        </div>
        {enabled && <div style={{ height: win.padTop }} aria-hidden />}
        <ul>
          {rows.flat().map((d) => (
            <LibraryRow
              key={d.id}
              drop={d}
              variant="table"
              selected={selection.isSelected(d.id)}
              onSelect={(e) => (e.shiftKey ? selection.extendTo(d.id) : selection.toggle(d.id))}
              isFeatured={d.id === featuredId}
              onChanged={onChanged}
            />
          ))}
        </ul>
        {enabled && <div style={{ height: win.padBottom }} aria-hidden />}
      </div>
    );
  }

  if (view === "list") {
    return (
      <>
        {enabled && <div style={{ height: win.padTop }} aria-hidden />}
        <ul className="space-y-1.5">
          {rows.flat().map((d) => (
            <LibraryRow
              key={d.id}
              drop={d}
              variant="list"
              selected={selection.isSelected(d.id)}
              onSelect={(e) => (e.shiftKey ? selection.extendTo(d.id) : selection.toggle(d.id))}
              isFeatured={d.id === featuredId}
              onChanged={onChanged}
            />
          ))}
        </ul>
        {enabled && <div style={{ height: win.padBottom }} aria-hidden />}
      </>
    );
  }

  return (
    <>
      {enabled && <div style={{ height: win.padTop }} aria-hidden />}
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.flat().map((d) => (
          <div
            key={d.id}
            className={cx(
              "rounded-2xl transition",
              selection.isSelected(d.id) && "ring-2 ring-[rgb(var(--accent-rgb)/0.55)]"
            )}
          >
            <div className="relative">
              <SelectBox
                selected={selection.isSelected(d.id)}
                onSelect={(e) => (e.shiftKey ? selection.extendTo(d.id) : selection.toggle(d.id))}
                title={d.title?.trim() || "Untitled"}
              />
              <TrackCard
                drop={d}
                queue={drops}
                compact
                isFeatured={d.id === featuredId}
                onChanged={onChanged}
              />
            </div>
            <Stats d={d} isFeatured={d.id === featuredId} />
          </div>
        ))}
      </div>
      {enabled && <div style={{ height: win.padBottom }} aria-hidden />}
    </>
  );
}

export function SelectBox({
  selected,
  onSelect,
  title,
}: {
  selected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  title: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={`Select ${title}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e);
      }}
      data-testid="library-select-item"
      className={cx(
        "absolute left-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-md border backdrop-blur transition active:scale-90",
        selected
          ? "border-transparent bg-[rgb(var(--accent-rgb))] text-black"
          : "border-white/25 bg-black/45 text-transparent hover:border-white/45"
      )}
    >
      <Check className="h-3.5 w-3.5" />
    </button>
  );
}

function Stats({ d, isFeatured }: { d: Drop; isFeatured: boolean }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="mr-auto flex items-center gap-3 text-[11px] text-white/45">
        <span className="flex items-center gap-1" title="Plays">
          <Play className="h-3 w-3" />
          {d.plays ?? 0}
        </span>
        <span title="Vyb reactions">♥ {d.feels}</span>
        {d.ratingCount ? (
          <span className="flex items-center gap-1" title="Rating">
            <Star className="h-3 w-3 text-amber-300" fill="currentColor" />
            {(d.rating ?? 0).toFixed(1)} ({d.ratingCount})
          </span>
        ) : null}
      </span>
      {isFeatured && (
        <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
          <Star className="h-3 w-3" fill="currentColor" /> Featured
        </span>
      )}
    </div>
  );
}
