import { seededRandom } from "@/lib/utils";

export interface Coords {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_MI = 3958.8;
const MILES_PER_DEG_LAT = 69;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two coordinates, in miles. */
export function haversineMiles(a: Coords, b: Coords): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MI * 2 * Math.asin(Math.sqrt(h));
}

/**
 * Deterministically anchor a confession to a fixed world point near an origin.
 * The offset (distance + bearing) is derived from the confession's seed so the
 * anchor is stable, while the *distance to the user* is then computed live from
 * their real, moving position — giving genuine realtime proximity.
 */
export function anchorFrom(origin: Coords, seed: number): Coords {
  const rand = seededRandom(seed);
  const distanceMi = 0.2 + rand() * 22;
  const bearing = rand() * 2 * Math.PI;
  const dLat = (distanceMi / MILES_PER_DEG_LAT) * Math.cos(bearing);
  const lngScale = Math.max(0.1, Math.cos(toRad(origin.lat)));
  const dLng =
    (distanceMi / (MILES_PER_DEG_LAT * lngScale)) * Math.sin(bearing);
  return { lat: origin.lat + dLat, lng: origin.lng + dLng };
}

/** Human-friendly miles, e.g. 0.3 / 1.2 / 14. */
export function formatMiles(mi: number): string {
  if (mi < 0.1) return "right here";
  if (mi < 10) return `${mi.toFixed(1)} mi`;
  return `${Math.round(mi)} mi`;
}

/**
 * Coarse proximity label used on cards/posts: anything under 3 miles reads
 * "Nearby"; beyond that it's "<n> mi". Never exposes "here"/exact position.
 */
export function proximityLabel(mi: number): string {
  if (mi < 3) return "Nearby";
  return `${Math.round(mi)} mi`;
}
