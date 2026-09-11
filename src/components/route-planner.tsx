import { useState } from "react";
import { useData } from "@/lib/data-context";
import { deriveEventLocale, localizeStartAddress } from "@/lib/event-locale";
import { GeocodeError, type GeocodeCandidate } from "@/lib/geocode";
import { buildGoogleMapsRouteLegs, type RouteLegLink } from "@/lib/google-maps";
import type { RouteResult, Stop } from "@/lib/types";

interface RoutePlannerProps {
  eventId: string;
  stops: Stop[];
  selectedIds: Set<string>;
}

function formatMiles(meters: number) {
  return `${(meters / 1609.34).toFixed(1)} mi`;
}

/** Which stops a leg covers, numbered to match the ordered list above it. */
function describeLegCoverage(leg: RouteLegLink) {
  if (leg.stopCount === 0) return "drive home";
  if (leg.stopCount === 1) return `stop ${leg.firstStop}`;
  return `stops ${leg.firstStop}–${leg.lastStop}`;
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function RoutePlanner({ eventId, stops, selectedIds }: RoutePlannerProps) {
  const { calculateRoute, geocodeAddress } = useData();
  const [startAddress, setStartAddress] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // When the address resolves to more than one place, we hold the candidates
  // (and the exact query they came from) and ask which the user meant.
  const [candidates, setCandidates] = useState<GeocodeCandidate[] | null>(null);
  const [pendingQuery, setPendingQuery] = useState("");
  // The address the shown route actually started from (locale-completed), used
  // for the results list and the Google Maps hand-off so they stay consistent
  // with what was geocoded rather than the raw text.
  const [routedStart, setRoutedStart] = useState("");

  const selectedCount = selectedIds.size;
  // "City, ST ZIP" inferred from the event's stops, so a bare street start
  // address can be assumed to be in the same town.
  const eventLocale = deriveEventLocale(stops);

  /** Runs the route from an already-resolved starting point. */
  async function routeFrom(start: GeocodeCandidate, startText: string) {
    setCandidates(null);
    setError(null);
    setResult(null);
    setIsCalculating(true);
    try {
      const route = await calculateRoute({
        eventId,
        selectedStopIds: Array.from(selectedIds),
        startAddress: startText,
        startLat: start.lat,
        startLng: start.lng,
      });
      setRoutedStart(startText);
      setResult(route);
    } catch {
      setError("Couldn't calculate a route just now. Try again in a moment.");
    } finally {
      setIsCalculating(false);
    }
  }

  async function handleCalculate() {
    setError(null);
    setCandidates(null);
    if (selectedCount === 0) {
      setError("Check at least one stop before calculating a route.");
      return;
    }
    const typed = startAddress.trim();
    if (typed.length === 0) {
      setError("Enter a starting address first.");
      return;
    }
    // Assume the event's town when the user typed only a street.
    const query = localizeStartAddress(typed, eventLocale);

    setIsCalculating(true);
    setResult(null);
    try {
      // Validate the starting address by geocoding it — a typo can't sail
      // through into the route or the Google Maps link anymore.
      const matches = await geocodeAddress(query);
      if (matches.length === 0) {
        setError(`We couldn't find “${query}”. Add a city and state (or ZIP), or check the spelling.`);
        return;
      }
      if (matches.length > 1) {
        // Ambiguous — let the user disambiguate rather than guessing for them.
        setPendingQuery(query);
        setCandidates(matches);
        return;
      }
      await routeFrom(matches[0], query);
    } catch (e) {
      setError(e instanceof GeocodeError ? e.message : "Something went wrong looking up that address.");
    } finally {
      setIsCalculating(false);
    }
  }

  const orderedStops = result ? result.orderedStopIds.map((id) => stops.find((s) => s.id === id)).filter((s): s is Stop => !!s) : [];
  const googleMapsLegs = result ? buildGoogleMapsRouteLegs(routedStart, orderedStops.map((s) => s.rawAddress)) : [];

  return (
    <div className="card space-y-5 p-5">
      <h2 className="text-[17px] font-semibold tracking-tight text-ink">Plan your route</h2>

      <div>
        <label className="field-label">Your starting address</label>
        <input
          value={startAddress}
          onChange={(e) => setStartAddress(e.target.value)}
          placeholder="e.g. 42 Union St, Clinton, MA 01510"
          className="field"
        />
        {eventLocale && (
          <p className="field-hint">A street with no town is assumed to be in {eventLocale}.</p>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="button"
        onClick={handleCalculate}
        disabled={isCalculating}
        className="btn btn-primary btn-lg w-full"
      >
        {isCalculating ? "Calculating best route…" : `Calculate Route (${selectedCount} stop${selectedCount === 1 ? "" : "s"} selected)`}
      </button>

      {candidates && (
        <div className="space-y-2 rounded-field border border-hairline bg-surface-sunken p-3">
          <p className="text-sm font-medium text-ink">Which starting address did you mean?</p>
          <ul className="space-y-1.5">
            {candidates.map((candidate) => (
              <li key={`${candidate.lat},${candidate.lng}`}>
                <button
                  type="button"
                  onClick={() => routeFrom(candidate, pendingQuery)}
                  className="w-full rounded-field border border-hairline bg-surface px-3 py-2 text-left text-sm text-ink transition-colors duration-150 hover:border-accent hover:bg-accent-soft"
                >
                  {candidate.displayName}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setCandidates(null)} className="btn-text text-xs">
            None of these — let me edit the address
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-5 border-t border-hairline pt-5">
          <dl className="grid grid-cols-3 gap-3 rounded-field bg-surface-sunken p-4 text-center">
            <div>
              <dt className="text-xs text-ink-muted">Total distance</dt>
              <dd className="mt-1 text-lg font-semibold tracking-tight text-ink">
                {formatMiles(result.totalDistanceMeters)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Est. drive time</dt>
              <dd className="mt-1 text-lg font-semibold tracking-tight text-ink">
                {formatDuration(result.totalDurationSeconds)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Stops</dt>
              <dd className="mt-1 text-lg font-semibold tracking-tight text-ink">{orderedStops.length}</dd>
            </div>
          </dl>

          <ol className="space-y-2.5">
            <li className="flex items-center gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
                S
              </span>
              <span className="text-ink-muted">{routedStart} (start)</span>
            </li>
            {orderedStops.map((stop, index) => (
              <li key={stop.id} className="flex items-center gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-white">
                  {index + 1}
                </span>
                <span className="text-ink">
                  {stop.rawAddress}
                  {stop.label ? ` — ${stop.label}` : ""}
                </span>
              </li>
            ))}
            <li className="flex items-center gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
                🏁
              </span>
              <span className="text-ink-muted">{routedStart} (return trip)</span>
            </li>
          </ol>

          <div className="space-y-2">
            {googleMapsLegs.map((leg) => (
              <a
                key={leg.url}
                href={leg.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary w-full"
              >
                Open in Google Maps
                {googleMapsLegs.length > 1 ? ` (${describeLegCoverage(leg)})` : ""}
              </a>
            ))}
            {googleMapsLegs.length > 1 && (
              <p className="text-center text-xs text-ink-subtle">
                Google Maps caps a single link at ~10 addresses, so the drive is split into{" "}
                {googleMapsLegs.length} legs. Open them in order — each one picks up where the
                last left off.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
