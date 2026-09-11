// Turning an address string into coordinates.
//
// This is the one piece the whole "put stops on a map and route between them"
// story hangs on: without coordinates an imported stop is just text. We hit
// OpenStreetMap's Nominatim service directly from the browser, behind a small
// adapter so the rest of the app never imports `fetch` or knows the provider's
// name — swapping to a keyed service (LocationIQ, MapTiler) or a server-side
// endpoint later means rewriting only this file.
//
// ⚠️ Caveats, all inherited from Nominatim's usage policy:
//   - Max 1 request/second. Batch callers must space their requests out; see
//     GEOCODE_MIN_INTERVAL_MS and how data-provider paces its loop.
//   - Bulk geocoding from a browser is explicitly discouraged for heavy use.
//     Fine for dev and town-sized events; a production deployment should move
//     this behind the backend against a provider that permits volume.

/** One candidate match for an address, ranked best-first by the provider. */
export interface GeocodeCandidate {
  lat: number;
  lng: number;
  /** The full address the geocoder resolved to, e.g. "12 High St, Clinton, …". */
  displayName: string;
}

/** Anything that went wrong reaching or reading the geocoder, with a message
 * safe to show the user. */
export class GeocodeError extends Error {}

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";

/**
 * Stay just over Nominatim's 1 req/sec cap. Batch geocoders should wait this
 * long between calls; anything faster risks being rate-limited or blocked.
 */
export const GEOCODE_MIN_INTERVAL_MS = 1100;

/**
 * Builds the Nominatim search URL. Kept pure and exported so the query
 * construction can be tested without a network round-trip.
 */
export function buildNominatimUrl(query: string, limit = 5) {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    // We compose our own display string from the parts, so skip the extra payload.
    addressdetails: "0",
    limit: String(Math.max(1, Math.min(limit, 10))),
    // The app is US-only for now; biasing the query keeps a bare "Main St,
    // Clinton" from resolving to a Clinton in another country.
    countrycodes: "us",
  });
  return `${NOMINATIM_ENDPOINT}?${params.toString()}`;
}

// Secondary unit designators (apartment/suite/etc.) that Nominatim chokes on:
// "250 Grove St, Unit B, Clinton, MA" fails, while "250 Grove St, Clinton, MA"
// resolves fine. Matched as whole words, taking the designator and the
// unit token that follows it, up to the next comma or the end of the string.
const SECONDARY_UNIT =
  /[,\s]+(?:unit|apt|apartment|suite|ste|bldg|building|fl|floor|rm|room|lot|space|spc|trailer|trlr|dept|department|#)\b\.?\s*#?\s*[\w-]*\s*(?=,|$)/i;

/**
 * Drops a secondary unit designator from an address so a street-level geocode
 * can still succeed. Returns the address unchanged when there's nothing to
 * strip, so callers can cheaply detect "did this actually simplify?".
 */
export function stripSecondaryUnit(address: string): string {
  const stripped = address
    .replace(SECONDARY_UNIT, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .trim();
  return stripped;
}

interface NominatimRow {
  lat?: string;
  lon?: string;
  display_name?: string;
}

/**
 * Reads Nominatim's JSON array into candidates, dropping any row without a
 * usable lat/lon. Pure and exported for testing against captured responses.
 */
export function parseNominatimResults(payload: unknown): GeocodeCandidate[] {
  if (!Array.isArray(payload)) return [];

  const candidates: GeocodeCandidate[] = [];
  for (const row of payload as NominatimRow[]) {
    const lat = Number(row?.lat);
    const lng = Number(row?.lon);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      candidates.push({ lat, lng, displayName: row?.display_name?.trim() || "" });
    }
  }
  return candidates;
}

/**
 * Geocodes one address to a best-first list of candidates. Returns an empty
 * array when the address simply doesn't resolve (a normal, non-error outcome);
 * throws GeocodeError only when the service can't be reached or read.
 */
export async function geocode(
  query: string,
  opts: { limit?: number; signal?: AbortSignal } = {},
): Promise<GeocodeCandidate[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  let response: Response;
  try {
    response = await fetch(buildNominatimUrl(trimmed, opts.limit ?? 5), {
      headers: { Accept: "application/json" },
      signal: opts.signal,
    });
  } catch (error) {
    // An aborted request is a caller's deliberate cancellation, not a failure.
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new GeocodeError("Couldn't reach the address lookup service. Check your connection and try again.");
  }

  if (!response.ok) {
    throw new GeocodeError(`The address lookup service returned an error (${response.status}). Try again in a moment.`);
  }

  try {
    return parseNominatimResults(await response.json());
  } catch {
    throw new GeocodeError("The address lookup service returned something unreadable. Try again in a moment.");
  }
}
