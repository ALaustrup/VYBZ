/** Session filters for Spark Love / Meetup decks. */

export interface SparkLoveMeetupFilters {
  radiusMiles: number | null;
  ageMin: number | null;
  ageMax: number | null;
  lookingFor: string[];
  meetupIntents: string[];
  mustShareMeetup: boolean;
}

const KEY = "vybz.sparkLoveMeetupFilters";

export const EMPTY_SPARK_FILTERS: SparkLoveMeetupFilters = {
  radiusMiles: null,
  ageMin: null,
  ageMax: null,
  lookingFor: [],
  meetupIntents: [],
  mustShareMeetup: false,
};

export function loadSparkFilters(): SparkLoveMeetupFilters {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return { ...EMPTY_SPARK_FILTERS, lookingFor: [], meetupIntents: [] };
    const p = JSON.parse(raw) as Partial<SparkLoveMeetupFilters>;
    return {
      radiusMiles: typeof p.radiusMiles === "number" ? p.radiusMiles : null,
      ageMin: typeof p.ageMin === "number" ? p.ageMin : null,
      ageMax: typeof p.ageMax === "number" ? p.ageMax : null,
      lookingFor: Array.isArray(p.lookingFor) ? p.lookingFor.filter((x) => typeof x === "string") : [],
      meetupIntents: Array.isArray(p.meetupIntents) ? p.meetupIntents.filter((x) => typeof x === "string") : [],
      mustShareMeetup: !!p.mustShareMeetup,
    };
  } catch {
    return { ...EMPTY_SPARK_FILTERS, lookingFor: [], meetupIntents: [] };
  }
}

export function saveSparkFilters(f: SparkLoveMeetupFilters): void {
  try { sessionStorage.setItem(KEY, JSON.stringify(f)); } catch { /* ignore */ }
}

export function sparkFilterCount(f: SparkLoveMeetupFilters): number {
  return (f.radiusMiles != null ? 1 : 0)
    + (f.ageMin != null || f.ageMax != null ? 1 : 0)
    + (f.lookingFor.length ? 1 : 0)
    + (f.meetupIntents.length ? 1 : 0)
    + (f.mustShareMeetup ? 1 : 0);
}
