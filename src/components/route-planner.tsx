import { useState } from "react";
import { useData } from "@/lib/data-context";
import { buildGoogleMapsRouteLegs } from "@/lib/google-maps";
import type { RouteResult, Stop } from "@/lib/types";

interface RoutePlannerProps {
  eventId: string;
  stops: Stop[];
  selectedIds: Set<string>;
}

function formatMiles(meters: number) {
  return `${(meters / 1609.34).toFixed(1)} mi`;
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function RoutePlanner({ eventId, stops, selectedIds }: RoutePlannerProps) {
  const { calculateRoute } = useData();
  const [startAddress, setStartAddress] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedCount = selectedIds.size;

  async function handleCalculate() {
    setError(null);
    if (selectedCount === 0) {
      setError("Check at least one stop before calculating a route.");
      return;
    }
    if (startAddress.trim().length === 0) {
      setError("Enter a starting address first.");
      return;
    }
    setIsCalculating(true);
    setResult(null);
    try {
      const route = await calculateRoute({
        eventId,
        selectedStopIds: Array.from(selectedIds),
        startAddress,
      });
      setResult(route);
    } finally {
      setIsCalculating(false);
    }
  }

  const orderedStops = result ? result.orderedStopIds.map((id) => stops.find((s) => s.id === id)).filter((s): s is Stop => !!s) : [];
  const googleMapsLegs = result ? buildGoogleMapsRouteLegs(startAddress, orderedStops.map((s) => s.rawAddress)) : [];

  return (
    <div className="card space-y-5 p-5">
      <h2 className="text-[17px] font-semibold tracking-tight text-ink">Plan your route</h2>

      <div>
        <label className="field-label">Your starting address</label>
        <input
          value={startAddress}
          onChange={(e) => setStartAddress(e.target.value)}
          placeholder="e.g. 42 Home St, Maple Grove, MA"
          className="field"
        />
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
              <span className="text-ink-muted">{startAddress} (start)</span>
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
              <span className="text-ink-muted">{startAddress} (return trip)</span>
            </li>
          </ol>

          <div className="space-y-2">
            {googleMapsLegs.map((url, index) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary w-full"
              >
                Open in Google Maps{googleMapsLegs.length > 1 ? ` (leg ${index + 1} of ${googleMapsLegs.length})` : ""}
              </a>
            ))}
            {googleMapsLegs.length > 1 && (
              <p className="text-center text-xs text-ink-subtle">
                Split into {googleMapsLegs.length} legs — Google Maps caps navigation at ~9 stops per link.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
