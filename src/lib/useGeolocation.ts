import { useCallback, useEffect, useRef, useState } from "react";
import type { Coords } from "@/lib/geo";

export type GeoStatus =
  | "idle"
  | "locating"
  | "granted"
  | "denied"
  | "unavailable";

interface GeoState {
  status: GeoStatus;
  coords: Coords | null;
  accuracy: number | null;
  updatedAt: number | null;
  error: string | null;
  /** Begin (and continuously watch) the device's real position. */
  request: () => void;
}

/**
 * Thin wrapper over the browser Geolocation API. Uses watchPosition so the
 * Local feed reflects the user's position in real time as they move.
 */
export function useGeolocation(): GeoState {
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }
    setStatus("locating");
    setError(null);

    // PRIVACY + SAFETY: we deliberately request only APPROXIMATE location
    // (enableHighAccuracy: false). MYVYB only needs a coarse distance for the
    // Local feed; precise GPS is never requested, and coordinates are NEVER
    // stored or shared — they stay on-device to compute distance to (synthetic)
    // anchors. Approximate is also far more reliable on laptops/desktops.
    const onSuccess = (pos: GeolocationPosition) => {
      // Snap to ~1km so even on-device we keep a fuzzed position.
      const round = (n: number) => Math.round(n * 100) / 100;
      setStatus("granted");
      setCoords({ lat: round(pos.coords.latitude), lng: round(pos.coords.longitude) });
      setAccuracy(pos.coords.accuracy);
      setUpdatedAt(Date.now());
    };
    const onError = (err: GeolocationPositionError) => {
      setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
      setError(err.message);
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: false,
      timeout: 20000,
      maximumAge: 60000,
    });
    watchId.current = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: false,
      maximumAge: 60000,
    });
  }, []);

  useEffect(() => {
    return () => {
      if (watchId.current !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  return { status, coords, accuracy, updatedAt, error, request };
}
