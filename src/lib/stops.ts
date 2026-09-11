import type { Stop } from "./types";

/** A stop we have coordinates for — the only kind that can be mapped or routed. */
export type LocatedStop = Stop & { lat: number; lng: number };

/**
 * Whether a stop has been geocoded to a usable coordinate. The single source of
 * truth for "located"; as a type guard it also narrows `lat`/`lng` to numbers.
 */
export function isLocated(stop: Stop): stop is LocatedStop {
  return stop.lat != null && stop.lng != null;
}
