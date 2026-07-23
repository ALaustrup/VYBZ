/** Session-persisted hard filters for Network matches (§5.4i). */

export interface MatchHardFilters {
  remoteOnly: boolean;
  daw: string;
  language: string;
}

const KEY = "vybz.matchHardFilters";

export const EMPTY_MATCH_FILTERS: MatchHardFilters = {
  remoteOnly: false,
  daw: "",
  language: "",
};

export function loadMatchFilters(): MatchHardFilters {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return { ...EMPTY_MATCH_FILTERS };
    const parsed = JSON.parse(raw) as Partial<MatchHardFilters>;
    return {
      remoteOnly: !!parsed.remoteOnly,
      daw: typeof parsed.daw === "string" ? parsed.daw : "",
      language: typeof parsed.language === "string" ? parsed.language : "",
    };
  } catch {
    return { ...EMPTY_MATCH_FILTERS };
  }
}

export function saveMatchFilters(f: MatchHardFilters): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(f));
  } catch {
    /* ignore quota / private mode */
  }
}

export function matchFilterCount(f: MatchHardFilters): number {
  return (f.remoteOnly ? 1 : 0) + (f.daw ? 1 : 0) + (f.language ? 1 : 0);
}
