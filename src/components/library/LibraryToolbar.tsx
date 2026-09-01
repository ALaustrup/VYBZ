import { GalleryHorizontal, LayoutGrid, Maximize2, RectangleVertical, Rows3, Search, SlidersHorizontal, Table2, X } from "lucide-react";
import {
  EMPTY_FILTERS,
  GROUP_LABEL,
  SORT_LABEL,
  activeFilterCount,
  type LibraryFilters,
  type LibraryGroup,
  type LibrarySort,
  type LibraryView,
  availableFacets,
} from "@/lib/libraryQuery";
import { cx } from "@/lib/utils";

const VIEWS: Array<{ id: LibraryView; label: string; icon: typeof LayoutGrid }> = [
  { id: "cinema", label: "Cinema", icon: RectangleVertical },
  { id: "grid", label: "Grid", icon: LayoutGrid },
  { id: "list", label: "List", icon: Rows3 },
  { id: "table", label: "Table", icon: Table2 },
  { id: "shelves", label: "Shelves", icon: GalleryHorizontal },
];

const PILL =
  "flex h-8 items-center justify-center rounded-full text-white/35 transition hover:text-white/70";

export function LibraryToolbar({
  filters,
  onFilters,
  sort,
  onSort,
  group,
  onGroup,
  view,
  onView,
  facets,
  matched,
  total,
  filtersOpen,
  onFiltersOpen,
  composed = false,
  visualOpen = false,
  onToggleVisual,
}: {
  filters: LibraryFilters;
  onFilters: (next: LibraryFilters) => void;
  sort: LibrarySort;
  onSort: (next: LibrarySort) => void;
  group: LibraryGroup;
  onGroup: (next: LibraryGroup) => void;
  view: LibraryView;
  onView: (next: LibraryView) => void;
  facets: ReturnType<typeof availableFacets>;
  matched: number;
  total: number;
  filtersOpen: boolean;
  onFiltersOpen: (open: boolean) => void;
  composed?: boolean;
  visualOpen?: boolean;
  onToggleVisual?: () => void;
}) {
  const active = activeFilterCount(filters);
  const patch = (p: Partial<LibraryFilters>) => onFilters({ ...filters, ...p });
  const cinema = view === "cinema";

  return (
    <div className="space-y-2">
      <div className="no-scrollbar flex items-center gap-1 overflow-x-auto sm:gap-2">
        <div
          className={cx(
            "flex min-w-0 items-center gap-2 rounded-full bg-white/[0.04] px-3 ring-1 ring-white/[0.06] focus-within:ring-white/15",
            cinema ? "w-24 sm:w-auto sm:flex-1" : "flex-1",
          )}
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-white/30" />
          <input
            value={filters.q}
            onChange={(e) => patch({ q: e.target.value })}
            placeholder="Search"
            aria-label="Search your works"
            data-testid="library-search"
            className="h-9 w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
          {filters.q && (
            <button
              type="button"
              onClick={() => patch({ q: "" })}
              aria-label="Clear search"
              className="shrink-0 text-white/35 hover:text-white/70"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => onFiltersOpen(!filtersOpen)}
          aria-expanded={filtersOpen}
          data-testid="library-filters-toggle"
          className={cx(PILL, "gap-1.5 px-2.5 text-[11px] font-medium", (filtersOpen || active > 0) && "bg-white/[0.1] text-white")}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {active > 0 ? `${active} ${active === 1 ? "filter" : "filters"}` : cinema ? null : "Filters"}
        </button>

        <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label="Library view">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onView(v.id)}
              aria-label={`${v.label} view`}
              aria-pressed={view === v.id}
              data-testid={`library-view-${v.id}`}
              className={cx(PILL, "h-8 w-8", view === v.id && "bg-white/[0.1] text-white")}
            >
              <v.icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as LibrarySort)}
          aria-label="Sort library"
          data-testid="library-sort"
          className="h-8 max-w-[7.5rem] shrink-0 rounded-full border-0 bg-white/[0.04] px-2 text-[11px] text-white/80 focus:outline-none"
        >
          {(Object.keys(SORT_LABEL) as LibrarySort[]).map((s) => (
            <option key={s} value={s}>
              {SORT_LABEL[s]}
            </option>
          ))}
        </select>

        {onToggleVisual ? (
          <button
            type="button"
            onClick={onToggleVisual}
            aria-label="Full screen visual"
            aria-pressed={visualOpen}
            data-testid="library-visual-toggle"
            className={cx(PILL, "h-8 w-8", visualOpen && "bg-white/[0.1] text-white")}
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        ) : null}

        <span
          className={cx("font-mono text-[11px] text-white/30", cinema ? "hidden sm:inline" : "ml-auto")}
          data-testid="library-count"
        >
          {matched === total ? `${total} ${total === 1 ? "track" : "tracks"}` : `${matched} of ${total}`}
        </span>

        {!filtersOpen ? (
          <select
            value={group}
            onChange={(e) => onGroup(e.target.value as LibraryGroup)}
            aria-label="Group library"
            data-testid="library-group"
            className="sr-only"
          >
            {(Object.keys(GROUP_LABEL) as LibraryGroup[]).map((g) => (
              <option key={g} value={g}>
                {GROUP_LABEL[g]}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {filtersOpen && (
        <div className="space-y-3 rounded-2xl bg-white/[0.03] p-3 ring-1 ring-white/[0.06]" data-testid="library-filters">
          <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-white/35">
            Group
            <select
              value={group}
              onChange={(e) => onGroup(e.target.value as LibraryGroup)}
              aria-label="Group library"
              data-testid="library-group"
              className="rounded-full border-0 bg-white/[0.04] px-2.5 py-1.5 text-[13px] normal-case tracking-normal text-white/80 focus:outline-none"
            >
              {(Object.keys(GROUP_LABEL) as LibraryGroup[]).map((g) => (
                <option key={g} value={g}>
                  {GROUP_LABEL[g]}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {facets.formats.length > 0 && (
              <Select
                label="Format"
                value={filters.format}
                onChange={(v) => patch({ format: v })}
                options={facets.formats.map((f) => ({ value: f, label: f.toUpperCase() }))}
                testId="library-filter-format"
              />
            )}
            <Select
              label="Sample rate"
              value={filters.sampleRate}
              onChange={(v) => patch({ sampleRate: v as LibraryFilters["sampleRate"] })}
              options={[
                { value: "lt-44100", label: "Below 44.1 kHz" },
                { value: "44100", label: "44.1 kHz" },
                { value: "48000", label: "48 kHz" },
                { value: "gt-48000", label: "Above 48 kHz" },
                { value: "unknown", label: "Not recorded" },
              ]}
              testId="library-filter-rate"
            />
            <Select
              label="Duration"
              value={filters.duration}
              onChange={(v) => patch({ duration: v as LibraryFilters["duration"] })}
              options={[
                { value: "under-1m", label: "Under 1 min" },
                { value: "1-3m", label: "1–3 min" },
                { value: "3-6m", label: "3–6 min" },
                { value: "over-6m", label: "Over 6 min" },
              ]}
              testId="library-filter-duration"
            />
            <Select
              label="Uploaded"
              value={filters.uploaded}
              onChange={(v) => patch({ uploaded: v as LibraryFilters["uploaded"] })}
              options={[
                { value: "7d", label: "Last 7 days" },
                { value: "30d", label: "Last 30 days" },
                { value: "365d", label: "Last year" },
              ]}
              testId="library-filter-uploaded"
            />
            {facets.kinds.length > 0 && (
              <Select
                label="Kind"
                value={filters.assetKind}
                onChange={(v) => patch({ assetKind: v })}
                options={facets.kinds.map((k) => ({ value: k, label: k }))}
                testId="library-filter-kind"
              />
            )}
            {facets.releaseTypes.length > 0 && (
              <Select
                label="Release type"
                value={filters.releaseType}
                onChange={(v) => patch({ releaseType: v })}
                options={facets.releaseTypes.map((r) => ({ value: r, label: r }))}
                testId="library-filter-release-type"
              />
            )}
            {facets.licenses.length > 0 && (
              <Select
                label="License"
                value={filters.license}
                onChange={(v) => patch({ license: v })}
                options={facets.licenses.map((l) => ({ value: l, label: l }))}
                testId="library-filter-license"
              />
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Toggle on={filters.losslessOnly} onClick={() => patch({ losslessOnly: !filters.losslessOnly })} label="Lossless only" testId="library-filter-lossless" />
            <Toggle on={filters.withAssetOnly} onClick={() => patch({ withAssetOnly: !filters.withAssetOnly })} label="Has downloadable file" testId="library-filter-asset" />
            {composed && (
              <>
                <Toggle on={filters.onStage === "on"} onClick={() => patch({ onStage: filters.onStage === "on" ? "any" : "on" })} label="On my VYBZ" testId="library-filter-on-stage" />
                <Toggle on={filters.onStage === "off"} onClick={() => patch({ onStage: filters.onStage === "off" ? "any" : "off" })} label="Not on VYBZ" testId="library-filter-off-stage" />
              </>
            )}
            {active > 0 && (
              <button
                type="button"
                onClick={() => onFilters({ ...EMPTY_FILTERS })}
                data-testid="library-filters-clear"
                className="ml-auto rounded-full bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/60 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  testId: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-white/35">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
        className="rounded-lg border-0 bg-white/[0.04] px-2.5 py-2 text-[13px] normal-case tracking-normal text-white/85 focus:outline-none"
      >
        <option value="any">Any</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  on,
  onClick,
  label,
  testId,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      data-testid={testId}
      className={cx(
        "rounded-full px-3 py-1.5 text-[11px] font-medium transition",
        on ? "bg-white/[0.12] text-white" : "bg-white/[0.04] text-white/50 hover:text-white/80",
      )}
    >
      {label}
    </button>
  );
}
