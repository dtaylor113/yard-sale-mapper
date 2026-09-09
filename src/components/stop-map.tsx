import { useEffect } from "react";
import type { LatLngTuple } from "leaflet";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MOCK_TOWN_CENTER } from "@/lib/mock-data";
import type { Stop } from "@/lib/types";

interface StopMapProps {
  stops: Stop[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  height?: string;
}

type PlottedStop = Stop & { lat: number; lng: number };

function isPlottable(stop: Stop): stop is PlottedStop {
  return stop.lat != null && stop.lng != null;
}

// Circles rather than Leaflet's default pin images: they carry the
// selected/unselected state as fill color, and being pure SVG they sidestep
// the broken-marker-icon problem bundlers have with Leaflet's image assets.
const SELECTED = { color: "#ffffff", weight: 2, fillColor: "#0071e3", fillOpacity: 1 };
const UNSELECTED = { color: "#ffffff", weight: 2, fillColor: "#86868b", fillOpacity: 0.85 };

/** Frames the viewport on the plotted stops, without fighting the user's panning. */
function FitToStops({ positions }: { positions: LatLngTuple[] }) {
  const map = useMap();

  // The effect keys off a serialized copy of the points, not the array, so it
  // fires only when the set of stops actually changes. Depending on the array
  // would refit on every render and yank the map back mid-pan.
  const signature = JSON.stringify(positions);

  useEffect(() => {
    const points: LatLngTuple[] = JSON.parse(signature);
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(points, { padding: [40, 40] });
    }
  }, [map, signature]);

  return null;
}

export function StopMap({ stops, selectedIds, onToggle, height = "26rem" }: StopMapProps) {
  const plotted = stops.filter(isPlottable);
  const positions: LatLngTuple[] = plotted.map((stop) => [stop.lat, stop.lng]);
  const missingCoords = stops.length - plotted.length;

  return (
    <div className="space-y-2">
      {/* `relative z-0` deliberately creates a stacking context: Leaflet gives
          its panes and controls z-indexes up to 1000, which would otherwise
          paint over the sticky header and the modals. */}
      <div
        className="relative z-0 w-full overflow-hidden rounded-card border border-hairline shadow-card"
        style={{ height }}
      >
        <MapContainer
          center={[MOCK_TOWN_CENTER.lat, MOCK_TOWN_CENTER.lng]}
          zoom={14}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          {/* Attribution is required by the OSM tile usage policy. The public
              tile server is fine for development and light traffic; a real
              deployment should move to a proper provider (MapTiler et al). */}
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />

          <FitToStops positions={positions} />

          {plotted.map((stop) => {
            const isSelected = selectedIds.has(stop.id);
            return (
              <CircleMarker
                key={stop.id}
                center={[stop.lat, stop.lng]}
                radius={isSelected ? 10 : 7}
                pathOptions={isSelected ? SELECTED : UNSELECTED}
              >
                <Popup>
                  <div className="min-w-44 space-y-1.5">
                    <p className="text-sm font-medium text-ink">{stop.rawAddress}</p>
                    {stop.label && <span className="chip chip-accent">{stop.label}</span>}
                    {stop.notes && <p className="text-xs text-ink-muted">{stop.notes}</p>}
                    {stop.geocodeStatus === "failed" && (
                      <p className="text-xs text-danger">
                        ⚠ This address didn&apos;t geocode cleanly, so its position is approximate.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => onToggle(stop.id)}
                      className={`btn btn-sm w-full ${isSelected ? "btn-secondary" : "btn-primary"}`}
                    >
                      {isSelected ? "Remove from route" : "Add to route"}
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {plotted.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-surface/90 px-4 py-2 text-sm text-ink-muted shadow-card">
              No stops to show on the map yet
            </span>
          </div>
        )}
      </div>

      {missingCoords > 0 && (
        <p className="text-xs text-ink-subtle">
          {missingCoords} stop{missingCoords === 1 ? "" : "s"} could not be placed on the map (no
          coordinates yet).
        </p>
      )}
    </div>
  );
}
