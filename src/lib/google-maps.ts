// Builds a Google Maps "open for turn-by-turn navigation" deep link.
// Per ROADMAP.md §2 ("Where Google fits"), this is real, working logic (not a
// stub) — it's pure URL construction, requires no API key and no backend call.
//
// Google's consumer deep link caps out around 9-10 total stops (origin +
// waypoints + destination), so callers should chunk long routes into legs of
// at most MAX_STOPS_PER_LEG and open them sequentially.

export const MAX_STOPS_PER_LEG = 9;

function buildSingleLegUrl(origin: string, destination: string, waypoints: string[]) {
  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
  });
  if (waypoints.length > 0) {
    params.set("waypoints", waypoints.join("|"));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Given a start address and an ordered list of stop addresses to visit
 * (round trip back to start), returns one or more Google Maps URLs. Most
 * routes will be a single URL; routes with many stops are split into
 * sequential legs of at most `MAX_STOPS_PER_LEG` waypoints each, with each
 * leg's destination feeding into the next leg's origin.
 */
export function buildGoogleMapsRouteLegs(startAddress: string, orderedStopAddresses: string[]): string[] {
  if (orderedStopAddresses.length === 0) {
    return [];
  }

  // Round trip: visit every stop in order, then end back at the start address.
  const stopsThenHome = [...orderedStopAddresses, startAddress];
  const legs: string[] = [];
  // Each leg's destination becomes the next leg's origin, so the legs join up
  // into one continuous drive. The stride is fixed rather than derived from
  // the chunk length, which guarantees the loop always advances.
  let legOrigin = startAddress;

  for (let cursor = 0; cursor < stopsThenHome.length; cursor += MAX_STOPS_PER_LEG + 1) {
    const chunk = stopsThenHome.slice(cursor, cursor + MAX_STOPS_PER_LEG + 1);
    const destination = chunk[chunk.length - 1];
    legs.push(buildSingleLegUrl(legOrigin, destination, chunk.slice(0, -1)));
    legOrigin = destination;
  }

  return legs;
}
