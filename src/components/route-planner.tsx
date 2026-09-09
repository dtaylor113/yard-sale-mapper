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
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-base font-semibold text-gray-900">Plan your route</h2>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Your starting address</label>
        <input
          value={startAddress}
          onChange={(e) => setStartAddress(e.target.value)}
          placeholder="e.g. 42 Home St, Maple Grove, MA"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleCalculate}
        disabled={isCalculating}
        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isCalculating ? "Calculating best route…" : `Calculate Route (${selectedCount} stop${selectedCount === 1 ? "" : "s"} selected)`}
      </button>

      {result && (
        <div className="space-y-4 border-t border-gray-100 pt-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-500">Total distance: </span>
              <span className="font-semibold text-gray-900">{formatMiles(result.totalDistanceMeters)}</span>
            </div>
            <div>
              <span className="text-gray-500">Est. drive time: </span>
              <span className="font-semibold text-gray-900">{formatDuration(result.totalDurationSeconds)}</span>
            </div>
            <div>
              <span className="text-gray-500">Stops: </span>
              <span className="font-semibold text-gray-900">{orderedStops.length}</span>
            </div>
          </div>

          <ol className="space-y-2">
            <li className="flex items-center gap-2 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-800 text-xs font-semibold text-white">
                S
              </span>
              <span className="text-gray-700">{startAddress} (start)</span>
            </li>
            {orderedStops.map((stop, index) => (
              <li key={stop.id} className="flex items-center gap-2 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <span className="text-gray-700">
                  {stop.rawAddress}
                  {stop.label ? ` — ${stop.label}` : ""}
                </span>
              </li>
            ))}
            <li className="flex items-center gap-2 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-800 text-xs font-semibold text-white">
                🏁
              </span>
              <span className="text-gray-700">{startAddress} (return trip)</span>
            </li>
          </ol>

          <div className="space-y-2">
            {googleMapsLegs.map((url, index) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-md border border-blue-200 bg-blue-50 px-4 py-2.5 text-center text-sm font-medium text-blue-700 hover:bg-blue-100"
              >
                Open in Google Maps{googleMapsLegs.length > 1 ? ` (leg ${index + 1} of ${googleMapsLegs.length})` : ""}
              </a>
            ))}
            {googleMapsLegs.length > 1 && (
              <p className="text-center text-xs text-gray-400">
                Split into {googleMapsLegs.length} legs — Google Maps caps navigation at ~9 stops per link.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
