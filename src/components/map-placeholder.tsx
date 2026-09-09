"use client";

import type { Stop } from "@/lib/types";

interface MapPlaceholderProps {
  stops: Stop[];
  selectedStopIds?: Set<string>;
  height?: string;
}

// Placeholder for the real Leaflet/OSM map from ROADMAP.md Phase 3. Pins are
// positioned by simple lat/lng-to-percentage math just so the wireframe has
// some visual life — this is NOT a real map and has no real projection.
export function MapPlaceholder({ stops, selectedStopIds, height = "18rem" }: MapPlaceholderProps) {
  const withCoords = stops.filter((s): s is Stop & { lat: number; lng: number } => s.lat != null && s.lng != null);

  let bounds = { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 };
  if (withCoords.length > 0) {
    bounds = withCoords.reduce(
      (acc, s) => ({
        minLat: Math.min(acc.minLat, s.lat),
        maxLat: Math.max(acc.maxLat, s.lat),
        minLng: Math.min(acc.minLng, s.lng),
        maxLng: Math.max(acc.maxLng, s.lng),
      }),
      { minLat: withCoords[0].lat, maxLat: withCoords[0].lat, minLng: withCoords[0].lng, maxLng: withCoords[0].lng }
    );
  }
  const latRange = bounds.maxLat - bounds.minLat || 1;
  const lngRange = bounds.maxLng - bounds.minLng || 1;

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gradient-to-br from-green-50 to-blue-50"
      style={{ height }}
    >
      <span className="absolute left-2 top-2 rounded bg-white/80 px-2 py-1 text-xs font-medium text-gray-500">
        [Map Display — illustrative placeholder, not a real map]
      </span>

      {withCoords.map((stop) => {
        const xPct = 8 + (90 * (stop.lng - bounds.minLng)) / lngRange;
        const yPct = 15 + (75 * (bounds.maxLat - stop.lat)) / latRange;
        const isSelected = selectedStopIds ? selectedStopIds.has(stop.id) : true;
        return (
          <div
            key={stop.id}
            title={stop.rawAddress}
            className={`absolute -translate-x-1/2 -translate-y-full text-lg ${
              isSelected ? "opacity-100" : "opacity-30"
            }`}
            style={{ left: `${xPct}%`, top: `${yPct}%` }}
          >
            📍
          </div>
        );
      })}

      {withCoords.length === 0 && (
        <div className="flex h-full items-center justify-center text-sm text-gray-400">No stops to show yet</div>
      )}
    </div>
  );
}
