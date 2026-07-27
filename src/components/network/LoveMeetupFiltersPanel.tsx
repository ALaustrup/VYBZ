import { MEETUP_INTENTS } from "@/lib/profileFields";
import { cx } from "@/lib/utils";
import type { SparkLoveMeetupFilters } from "@/lib/sparkFilters";

const LOOKING_LOVE = ["Dating", "Friendship", "Something casual", "Activity partner", "Just exploring"];

export function LoveMeetupFiltersPanel({
  deck,
  filters,
  onChange,
}: {
  deck: "love" | "meetup";
  filters: SparkLoveMeetupFilters;
  onChange: (f: SparkLoveMeetupFilters) => void;
}) {
  function tog(key: "lookingFor" | "meetupIntents", v: string) {
    const cur = filters[key];
    const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    onChange({ ...filters, [key]: next });
  }

  return (
    <div className="mb-3 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="grid grid-cols-3 gap-2">
        <label className="text-[11px] text-white/45">
          Radius mi
          <input
            type="number"
            min={5}
            max={500}
            placeholder="100"
            value={filters.radiusMiles ?? ""}
            onChange={(e) => onChange({
              ...filters,
              radiusMiles: e.target.value ? Number(e.target.value) : null,
            })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white"
          />
        </label>
        <label className="text-[11px] text-white/45">
          Age min
          <input
            type="number"
            min={18}
            max={99}
            placeholder="18"
            value={filters.ageMin ?? ""}
            onChange={(e) => onChange({
              ...filters,
              ageMin: e.target.value ? Number(e.target.value) : null,
            })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white"
          />
        </label>
        <label className="text-[11px] text-white/45">
          Age max
          <input
            type="number"
            min={18}
            max={99}
            placeholder="99"
            value={filters.ageMax ?? ""}
            onChange={(e) => onChange({
              ...filters,
              ageMax: e.target.value ? Number(e.target.value) : null,
            })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white"
          />
        </label>
      </div>

      {deck === "love" && (
        <div>
          <p className="mb-1.5 text-[11px] uppercase tracking-wide text-white/35">Looking for</p>
          <div className="flex flex-wrap gap-1.5">
            {LOOKING_LOVE.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => tog("lookingFor", g)}
                className={cx(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium",
                  filters.lookingFor.includes(g) ? "bg-feel/25 text-feel ring-1 ring-feel/40" : "bg-white/5 text-white/55",
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {deck === "meetup" && (
        <div>
          <p className="mb-1.5 text-[11px] uppercase tracking-wide text-white/35">Meetup intents</p>
          <div className="flex flex-wrap gap-1.5">
            {MEETUP_INTENTS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => tog("meetupIntents", g)}
                className={cx(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium",
                  filters.meetupIntents.includes(g) ? "bg-aqua-400/20 text-aqua-100 ring-1 ring-aqua-300/30" : "bg-white/5 text-white/55",
                )}
              >
                {g}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onChange({ ...filters, mustShareMeetup: !filters.mustShareMeetup })}
            className={cx(
              "mt-2 text-[11px] font-semibold",
              filters.mustShareMeetup ? "text-feel" : "text-white/40",
            )}
          >
            {filters.mustShareMeetup ? "✓ Must share a meetup intent" : "Optional: require shared meetup intent"}
          </button>
        </div>
      )}
      <p className="text-[10px] text-white/30">Romantic intents require 18+. Prefs stay private.</p>
    </div>
  );
}
