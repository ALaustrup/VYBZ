import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AudioLines, Check, HardDrive, SearchX, Upload } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { LibraryToolbar } from "@/components/library/LibraryToolbar";
import { BatchActionBar } from "@/components/library/BatchActionBar";
import { LibraryRow } from "@/components/library/LibraryRow";
import { LibraryShelfTile } from "@/components/library/LibraryShelfTile";
import { LibraryCinemaTile } from "@/components/library/LibraryCinemaTile";
import { LibraryVisualStage } from "@/components/library/LibraryVisualStage";
import { useCinemaChrome } from "@/components/library/useCinemaChrome";
import { useCinemaKeyboard } from "@/components/library/useCinemaKeyboard";
import { PlaceOnVybzSheet } from "@/features/profile/PlaceOnVybzSheet";
import {
  isComposed,
  isOnStage,
  parseStageComposition,
  placedDropIds,
} from "@/features/profile/stageComposition";
import {
  loadLibraryArrangement,
  saveLibraryArrangement,
} from "@/features/library/libraryArrangement";
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
import { usePlayer } from "@/lib/audioBus";
import { useReduceFx } from "@/lib/display";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";
import type { Drop } from "@/types";
import type { LibraryWorkKind } from "@/lib/libraryQuery";

const ROW_HEIGHT = { list: 64, table: 44 } as const;

type LibraryChange = {
  kind: "deleted" | "renamed" | "featured" | "placed";
  dropId: string;
  title?: string;
};

const KIND_CHIPS: Array<{ id: LibraryWorkKind; label: string }> = [
  { id: "any", label: "All" },
  { id: "audio", label: "Audio" },
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
  { id: "file", label: "File" },
];

function KindChips({
  value,
  onChange,
  compact = false,
}: {
  value: LibraryWorkKind;
  onChange: (next: LibraryWorkKind) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cx("no-scrollbar flex gap-1 overflow-x-auto", compact && "min-w-0 flex-1")}
      data-testid="library-kind-chips"
      role="tablist"
      aria-label="Work kind"
    >
      {KIND_CHIPS.map((chip) => (
        <button
          key={chip.id}
          type="button"
          role="tab"
          aria-selected={value === chip.id}
          data-testid={`library-kind-${chip.id}`}
          onClick={() => onChange(chip.id)}
          className={cx(
            "shrink-0 rounded-full font-medium tracking-wide transition",
            compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1 text-[11px]",
            value === chip.id ? "bg-white/[0.1] text-white" : "text-white/40 hover:text-white/70",
          )}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

export function UploadsLibrary({
  initialDrops,
  featuredId,
  onFeaturedChange,
  onCompose,
}: {
  initialDrops: Drop[];
  featuredId?: string | null;
  onFeaturedChange?: () => void;
  onCompose?: () => void;
}) {
  const { userId, profile } = useSession();
  const player = usePlayer();
  const [drops, setDrops] = useState<Drop[]>(initialDrops);
  useEffect(() => {
    setDrops(initialDrops);
  }, [initialDrops]);

  const saved = useMemo(() => loadLibraryArrangement(userId), [userId]);
  const [filters, setFilters] = useState<LibraryFilters>({ ...EMPTY_FILTERS });
  const [sort, setSort] = useState<LibrarySort>(saved.sort);
  const [group, setGroup] = useState<LibraryGroup>(saved.group);
  const [view, setView] = useState<LibraryView>(saved.view);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [placing, setPlacing] = useState<Drop[] | null>(null);
  const [visualId, setVisualId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveLibraryArrangement(userId, { view, sort, group });
  }, [userId, view, sort, group]);

  const composition = parseStageComposition(profile?.profile);
  const composed = isComposed(composition);
  const onStageKey = composed
    ? [...placedDropIds(composition), featuredId ?? ""].filter(Boolean).sort().join(",")
    : "";
  const onStageIds = useMemo(() => {
    if (!composed) return null;
    return new Set(onStageKey.split(",").filter(Boolean));
  }, [composed, onStageKey]);

  const facets = useMemo(() => availableFacets(drops), [drops]);
  const { total, matched, groups } = useMemo(
    () => queryLibrary(drops, filters, sort, group, undefined, onStageIds),
    [drops, filters, sort, group, onStageIds],
  );

  const snapshotDropIds = useMemo(() => drops.map((d) => d.id), [drops]);
  const selection = useSelection(useMemo(() => matched.map((d) => d.id), [matched]));
  const visualIndex = visualId ? matched.findIndex((d) => d.id === visualId) : -1;
  const cinema = view === "cinema";
  const reduceFx = useReduceFx();
  const watching = cinema && player.playing && matched.some((d) => d.id === player.track?.id);
  const chrome = useCinemaChrome({
    cinema,
    filtersOpen,
    playing: watching,
    reduceFx,
    scrollRef,
  });
  useCinemaKeyboard({
    cinema,
    filtersOpen,
    visualOpen: visualIndex >= 0,
    reduceFx,
    scrollRef,
  });

  const toolbar = (
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
      composed={composed}
      visualOpen={!!visualId}
      onToggleVisual={matched.length > 0 ? toggleVisual : undefined}
    />
  );

  function applyChange(change: LibraryChange) {
    if (change.kind === "deleted") {
      setDrops((l) => l.filter((x) => x.id !== change.dropId));
      selection.remove([change.dropId]);
      if (change.dropId === featuredId) onFeaturedChange?.();
      if (visualId === change.dropId) setVisualId(null);
      return;
    }
    if (change.kind === "renamed") {
      setDrops((l) =>
        l.map((x) => (x.id === change.dropId ? { ...x, title: change.title?.trim() || null } : x)),
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
    if (visualId && gone.has(visualId)) setVisualId(null);
  }

  function toggleVisual() {
    if (visualId) {
      setVisualId(null);
      return;
    }
    const playing = matched.find((d) => d.id === player.track?.id);
    setVisualId(playing?.id ?? matched[0]?.id ?? null);
  }

  if (drops.length === 0) {
    return (
      <EmptyState
        icon={AudioLines}
        title="Nothing in your library yet"
        body="Upload a file. It stays private until you Place it on your VYBZ."
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            {onCompose ? (
              <button
                type="button"
                onClick={onCompose}
                data-testid="library-upload"
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/[0.06] px-3 text-[12px] font-medium text-white/85"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload
              </button>
            ) : null}
            <Link
              to="/library?tab=device"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/[0.06] px-3 text-[12px] font-medium text-white/85"
            >
              <HardDrive className="h-3.5 w-3.5" />
              This device
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <div
      className={cx("library-uploads flex min-h-0 flex-1 flex-col", cinema ? "relative gap-0" : "gap-2.5")}
      data-cinema-chrome={cinema && chrome.hidden ? "hidden" : "shown"}
    >
      {cinema && chrome.hidden ? (
        <button
          type="button"
          aria-label="Show library controls"
          data-testid="library-chrome-reveal"
          className="absolute inset-x-0 top-0 z-40 h-14"
          onClick={chrome.reveal}
        />
      ) : null}
      <div
        data-library-tools
        className={cinema ? "library-tools-overlay" : undefined}
        onFocus={chrome.onToolsFocus}
        onBlur={(e) => chrome.onToolsBlur(e.relatedTarget, e.currentTarget)}
      >
        {cinema ? (
          <div className="flex items-center gap-2">
            <KindChips
              compact
              value={filters.workKind}
              onChange={(workKind) => setFilters({ ...filters, workKind })}
            />
            <div className="shrink-0">{toolbar}</div>
          </div>
        ) : (
          <>
            {toolbar}
            <KindChips
              value={filters.workKind}
              onChange={(workKind) => setFilters({ ...filters, workKind })}
            />
          </>
        )}
      </div>

      {matched.length > 0 && view !== "cinema" && (
        <div className="flex items-center gap-2 text-[11px]">
          <button
            type="button"
            onClick={() => (selection.allVisibleSelected ? selection.clear() : selection.selectAll())}
            data-testid="library-select-all"
            className="flex items-center gap-1.5 rounded-full px-2 py-1 font-medium text-white/40 hover:text-white"
          >
            <span
              className={cx(
                "flex h-3.5 w-3.5 items-center justify-center rounded border",
                selection.allVisibleSelected
                  ? "border-transparent bg-white text-black"
                  : "border-white/25",
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
        cinema ? (
          <div
            ref={scrollRef}
            className="library-cinema no-scrollbar"
            data-testid="library-results"
          >
            <div
              className="library-cinema-tile flex flex-col items-center justify-center px-8 text-center"
              data-testid="library-cinema-empty"
            >
              <p className="font-display text-2xl font-semibold tracking-tight text-white">
                Nothing matches those filters
              </p>
              <p className="mt-2 max-w-sm text-[13px] text-white/45">
                Try a different search term, or clear the filters to see your whole library.
              </p>
              <button
                type="button"
                onClick={() => setFilters({ ...EMPTY_FILTERS })}
                data-testid="library-cinema-clear"
                className="mt-5 rounded-full bg-white/[0.08] px-4 py-2 text-[12px] font-medium text-white/80 hover:bg-white/[0.12]"
              >
                Show all
              </button>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={SearchX}
            title="Nothing matches those filters"
            body="Try a different search term, or clear the filters to see your whole library."
          />
        )
      ) : cinema ? (
        <div
          ref={scrollRef}
          className="library-cinema no-scrollbar"
          data-testid="library-results"
        >
          {groups.flatMap((g) =>
            g.drops.map((d, i) => (
              <LibraryCinemaTile
                key={d.id}
                drop={d}
                queue={matched}
                variant="cinema"
                groupLabel={i === 0 ? g.label : null}
                selected={selection.isSelected(d.id)}
                onSelect={(e) => (e.shiftKey ? selection.extendTo(d.id) : selection.toggle(d.id))}
                isFeatured={d.id === featuredId}
                onStage={composed && isOnStage(composition, d.id, featuredId)}
                snapshotDropIds={snapshotDropIds}
                onChanged={applyChange}
                onVisual={() => setVisualId(d.id)}
                visualOpen={visualId === d.id}
              />
            )),
          )}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto"
          data-testid="library-results"
        >
          {groups.map((g) => (
            <section key={g.key} className="mb-4">
              {g.label && (
                <div className="sticky top-0 z-10 mb-2 bg-abyss-950/70 py-1 backdrop-blur">
                  <h3 className="text-[11px] font-medium uppercase tracking-wider text-white/40">
                    {g.label}
                    <span className="ml-2 font-mono text-[10px] text-white/25">{g.drops.length}</span>
                  </h3>
                </div>
              )}
              <GroupBody
                drops={g.drops}
                view={view}
                scrollRef={scrollRef}
                featuredId={featuredId}
                compositionOnStage={(id) => composed && isOnStage(composition, id, featuredId)}
                snapshotDropIds={snapshotDropIds}
                selection={selection}
                onChanged={applyChange}
                onPlace={(items) => setPlacing(items)}
                onVisual={(id) => setVisualId(id)}
                visualId={visualId}
                virtualize={groups.length === 1 && (view === "list" || view === "table")}
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
        onPlace={(items) => setPlacing(items)}
      />

      <PlaceOnVybzSheet
        open={!!placing?.length}
        drops={placing ?? []}
        snapshotDropIds={snapshotDropIds}
        profile={profile}
        onClose={() => setPlacing(null)}
        onChanged={() => {
          onFeaturedChange?.();
          setPlacing(null);
        }}
      />

      {visualIndex >= 0 ? (
        <LibraryVisualStage
          drops={matched}
          index={visualIndex}
          onClose={() => setVisualId(null)}
          onIndex={(i) => setVisualId(matched[i]?.id ?? null)}
          onPlace={(d) => setPlacing([d])}
        />
      ) : null}
    </div>
  );
}

type SelectionApi = ReturnType<typeof useSelection>;

function GroupBody({
  drops,
  view,
  scrollRef,
  featuredId,
  compositionOnStage,
  snapshotDropIds,
  selection,
  onChanged,
  onPlace,
  onVisual,
  visualId,
  virtualize,
}: {
  drops: Drop[];
  view: LibraryView;
  scrollRef: React.RefObject<HTMLDivElement>;
  featuredId?: string | null;
  compositionOnStage: (id: string) => boolean;
  snapshotDropIds: string[];
  selection: SelectionApi;
  onChanged: (c: LibraryChange) => void;
  onPlace: (drops: Drop[]) => void;
  onVisual: (id: string) => void;
  visualId: string | null;
  virtualize: boolean;
}) {
  const dense = view === "list" || view === "table";
  const rowHeight = dense ? ROW_HEIGHT[view] : 1;
  const rowCount = dense ? drops.length : 0;
  const enabled = virtualize && dense && rowCount > 24;
  const win = useVirtualRows({ count: rowCount, rowHeight, scrollRef, enabled });

  if (view === "cinema") {
    return (
      <div className="flex flex-col gap-3 pb-8" data-testid="library-cinema">
        {drops.map((d) => (
          <LibraryCinemaTile
            key={d.id}
            drop={d}
            queue={drops}
            variant="cinema"
            selected={selection.isSelected(d.id)}
            onSelect={(e) => (e.shiftKey ? selection.extendTo(d.id) : selection.toggle(d.id))}
            isFeatured={d.id === featuredId}
            onStage={compositionOnStage(d.id)}
            snapshotDropIds={snapshotDropIds}
            onChanged={onChanged}
            onVisual={() => onVisual(d.id)}
            visualOpen={visualId === d.id}
          />
        ))}
      </div>
    );
  }

  if (view === "shelves") {
    return (
      <ul className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
        {drops.map((d) => (
          <LibraryShelfTile
            key={d.id}
            drop={d}
            selected={selection.isSelected(d.id)}
            onSelect={(e) => (e.shiftKey ? selection.extendTo(d.id) : selection.toggle(d.id))}
            isFeatured={d.id === featuredId}
            onStage={compositionOnStage(d.id)}
            onChanged={onChanged}
            onPlace={() => onPlace([d])}
            snapshotDropIds={snapshotDropIds}
          />
        ))}
      </ul>
    );
  }

  if (view === "grid") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="library-grid">
        {drops.map((d) => (
          <LibraryCinemaTile
            key={d.id}
            drop={d}
            queue={drops}
            variant="grid"
            selected={selection.isSelected(d.id)}
            onSelect={(e) => (e.shiftKey ? selection.extendTo(d.id) : selection.toggle(d.id))}
            isFeatured={d.id === featuredId}
            onStage={compositionOnStage(d.id)}
            snapshotDropIds={snapshotDropIds}
            onChanged={onChanged}
            onVisual={() => onVisual(d.id)}
            visualOpen={visualId === d.id}
          />
        ))}
      </div>
    );
  }

  const perRow = 1;
  const rows: Drop[][] = [];
  for (let i = win.start; i < win.end; i++) {
    rows.push(drops.slice(i * perRow, i * perRow + perRow));
  }

  if (view === "table") {
    return (
      <div className="overflow-hidden rounded-2xl bg-white/[0.03]">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2 border-b border-white/[0.06] px-2.5 py-2 text-[10px] font-medium uppercase tracking-wider text-white/35">
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
              onStage={compositionOnStage(d.id)}
              snapshotDropIds={snapshotDropIds}
              onChanged={onChanged}
            />
          ))}
        </ul>
        {enabled && <div style={{ height: win.padBottom }} aria-hidden />}
      </div>
    );
  }

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
            onStage={compositionOnStage(d.id)}
            snapshotDropIds={snapshotDropIds}
            onChanged={onChanged}
          />
        ))}
      </ul>
      {enabled && <div style={{ height: win.padBottom }} aria-hidden />}
    </>
  );
}
