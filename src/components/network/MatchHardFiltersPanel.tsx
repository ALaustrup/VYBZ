import { Check, X } from "lucide-react";
import { DAWS, CHOICE_FIELDS } from "@/lib/profileFields";
import { cx } from "@/lib/utils";
import type { MatchHardFilters } from "@/lib/matchFilters";
import { EMPTY_MATCH_FILTERS } from "@/lib/matchFilters";

const selCls =
  "min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/85 focus:border-veil-400/60 focus:outline-none";

const LANGUAGES =
  CHOICE_FIELDS.find((f) => f.key === "languages")?.options ?? [];

/** Non-negotiables for match decks — remote / DAW / language (§5.4i). */
export function MatchHardFiltersPanel({
  filters,
  onChange,
}: {
  filters: MatchHardFilters;
  onChange: (next: MatchHardFilters) => void;
}) {
  const active = filters.remoteOnly || !!filters.daw || !!filters.language;

  return (
    <div className="mb-3 space-y-2.5 rounded-2xl border border-[var(--hairline)] bg-white/[0.02] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
          Must have
        </p>
        {active && (
          <button
            type="button"
            onClick={() => onChange({ ...EMPTY_MATCH_FILTERS })}
            className="flex items-center gap-1 text-[11px] font-medium text-white/45 hover:text-white/70"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange({ ...filters, remoteOnly: !filters.remoteOnly })}
        className="flex items-center gap-2 text-sm text-white/75"
      >
        <span
          className={cx(
            "flex h-5 w-5 items-center justify-center rounded-md border",
            filters.remoteOnly ? "border-feel bg-feel/20 text-feel" : "border-white/20",
          )}
        >
          {filters.remoteOnly && <Check className="h-3.5 w-3.5" />}
        </span>
        Remote only
      </button>
      <div className="flex gap-2">
        <select
          value={filters.daw}
          onChange={(e) => onChange({ ...filters, daw: e.target.value })}
          className={selCls}
        >
          <option value="">Any DAW</option>
          {DAWS.map((d) => (
            <option key={d.id} value={d.id} className="bg-ink-900">
              {d.label}
            </option>
          ))}
        </select>
        <select
          value={filters.language}
          onChange={(e) => onChange({ ...filters, language: e.target.value })}
          className={selCls}
        >
          <option value="">Any language</option>
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang} className="bg-ink-900">
              {lang}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
