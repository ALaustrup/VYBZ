import { LayoutGrid, Rows3, Search, SlidersHorizontal, Table2, X } from "lucide-react";
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
  { id: "grid", label: "Grid", icon: LayoutGrid },
  { id: "list", label: "List", icon: Rows3 },
  { id: "table", label: "Table", icon: Table2 },
];

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
}) {
  const active = activeFilterCount(filters);
  const patch = (p: Partial<LibraryFilters>) => onFilters({ ...filters, ...p });

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="forge-field min-w-0 flex-1">
          <Search className="forge-field-icon h-4 w-4" />
          <input
            value={filters.q}
            onChange={(e) => patch({ q: e.target.value })}
            placeholder="Search title, collection, creator…"
            aria-label="Search your works"
            data-testid="library-search"
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
          className={cx("forge-chip gap-1.5 !min-h-9 px-3 text-xs font-semibold", (filtersOpen || active > 0) && "forge-chip--active")}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {active > 0 ? `${active} filter${active === 1 ? "" : "s"}` : "Filters"}
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
              className={cx("forge-chip h-9 w-9", view === v.id && "forge-chip--active")}
            >
              <v.icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label className="flex items-center gap-1.5 text-white/40">
          Sort
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value as LibrarySort)}
            aria-label="Sort library"
            data-testid="library-sort"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-white/85 focus:border-veil-400/60 focus:outline-none"
          >
            {(Object.keys(SORT_LABEL) as LibrarySort[]).map((s) => (
              <option key={s} value={s}>
                {SORT_LABEL[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5 text-white/40">
          Group
          <select
            value={group}
            onChange={(e) => onGroup(e.target.value as LibraryGroup)}
            aria-label="Group library"
            data-testid="library-group"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-white/85 focus:border-veil-400/60 focus:outline-none"
          >
            {(Object.keys(GROUP_LABEL) as LibraryGroup[]).map((g) => (
              <option key={g} value={g}>
                {GROUP_LABEL[g]}
              </option>
            ))}
          </select>
        </label>

        <span className="ml-auto font-mono text-[11px] text-white/35" data-testid="library-count">
          {matched === total ? `${total} tracks` : `${matched} of ${total}`}
        </span>
      </div>

      {filtersOpen && (
        <div className="forge-glass relative space-y-3 p-3" data-testid="library-filters">
          <span className="forge-glass-edge pointer-events-none" aria-hidden />
          <div className="relative z-[1] grid gap-2.5 sm:grid-cols-2">
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

          <div className="relative z-[1] flex flex-wrap gap-1.5">
            <Toggle on={filters.losslessOnly} onClick={() => patch({ losslessOnly: !filters.losslessOnly })} label="Lossless only" testId="library-filter-lossless" />
            <Toggle on={filters.withAssetOnly} onClick={() => patch({ withAssetOnly: !filters.withAssetOnly })} label="Has downloadable file" testId="library-filter-asset" />
            {active > 0 && (
              <button
                type="button"
                onClick={() => onFilters({ ...EMPTY_FILTERS })}
                data-testid="library-filters-clear"
                className="ml-auto rounded-full bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/60 hover:text-white active:scale-95"
              >
                Clear all
              </button>
            )}
          </div>

          <p className="relative z-[1] text-[10px] leading-snug text-white/25">
            Filters cover the fields your uploads actually store. Genre, mood, tags and
            processing state are not recorded on a track yet, so they are not offered here.
          </p>
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
        className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-[13px] normal-case tracking-normal text-white/85 focus:border-veil-400/60 focus:outline-none"
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
        "rounded-full px-3 py-1.5 text-[11px] font-semibold transition active:scale-95",
        on
          ? "bg-[rgb(var(--accent-rgb)/0.16)] text-white ring-1 ring-[rgb(var(--accent-rgb)/0.45)]"
          : "bg-white/[0.04] text-white/50 hover:text-white/80"
      )}
    >
      {label}
    </button>
  );
}
