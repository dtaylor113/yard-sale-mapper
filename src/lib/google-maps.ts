// Builds a Google Maps "open for turn-by-turn navigation" deep link.
// Per ROADMAP.md §2 ("Where Google fits"), this is real, working logic (not a
// stub) — it's pure URL construction, requires no API key and no backend call.
//
// Google's consumer deep link caps out at around ten addresses (origin +
// waypoints + destination), so callers should chunk long routes into legs and
// open them sequentially.

export const MAX_WAYPOINTS_PER_LEG = 9;

// A leg's destination counts as an address too, so it can carry one more than
// its waypoints. Note that the destination is usually a stop, which means a
// full leg drives to MAX_WAYPOINTS_PER_LEG + 1 stops, not MAX_WAYPOINTS_PER_LEG.
const ADDRESSES_PER_LEG = MAX_WAYPOINTS_PER_LEG + 1;

export interface RouteLegLink {
  /** Google Maps deep link for this leg. */
  url: string;
  /**
   * 1-based, inclusive range of ordered stops this leg drives to. A final leg
   * that only returns to the start address covers no stops, in which case
   * `stopCount` is 0 and the range is empty.
   */
  firstStop: number;
  lastStop: number;
  stopCount: number;
}

function buildSingleLegUrl(origin: string, destination: string, waypoints: string[]) {
  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    // Without an explicit mode Google picks whichever modes look "most
    // relevant" from the route and the rider's history. That also triggers a
    // long-standing iOS bug where a multi-waypoint link errors out with
    // "Unsupported Link" if the last mode used was transit.
    travelmode: "driving",
    // Skips the route preview and starts turn-by-turn. Google only honors this
    // when the origin is near the driver's current location, which holds for
    // these legs: the first starts at their own address, and each later one
    // starts at the stop where the previous leg left them.
    dir_action: "navigate",
  });
  if (waypoints.length > 0) {
    params.set("waypoints", waypoints.join("|"));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Given a start address and an ordered list of stop addresses to visit
 * (round trip back to start), returns one or more Google Maps legs. Most
 * routes will be a single leg; routes with many stops are split into
 * sequential legs of at most `MAX_WAYPOINTS_PER_LEG` waypoints each, with each
 * leg's destination feeding into the next leg's origin.
 */
export function buildGoogleMapsRouteLegs(
  startAddress: string,
  orderedStopAddresses: string[],
): RouteLegLink[] {
  if (orderedStopAddresses.length === 0) {
    return [];
  }

  // Round trip: visit every stop in order, then end back at the start address.
  const stopsThenHome = [...orderedStopAddresses, startAddress];
  const legs: RouteLegLink[] = [];
  // Each leg's destination becomes the next leg's origin, so the legs join up
  // into one continuous drive. The stride is fixed rather than derived from
  // the chunk length, which guarantees the loop always advances.
  let legOrigin = startAddress;

  for (let cursor = 0; cursor < stopsThenHome.length; cursor += ADDRESSES_PER_LEG) {
    const chunk = stopsThenHome.slice(cursor, cursor + ADDRESSES_PER_LEG);
    const destination = chunk[chunk.length - 1];
    // The trip home is the one address in `stopsThenHome` that isn't a stop,
    // so whichever leg carries it covers one fewer stop than it has addresses.
    const stopCount = Math.min(chunk.length, orderedStopAddresses.length - cursor);
    legs.push({
      url: buildSingleLegUrl(legOrigin, destination, chunk.slice(0, -1)),
      firstStop: cursor + 1,
      lastStop: cursor + stopCount,
      stopCount,
    });
    legOrigin = destination;
  }

  return legs;
}
