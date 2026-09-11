import { useCallback, useMemo, useState, type ReactNode } from "react";
import { DataContext, type DataContextValue } from "./data-context";
import { newEventId } from "./event-url";
import { DEFAULT_MAP_CENTER, MOCK_EVENTS, MOCK_STOPS } from "./mock-data";
import type {
  CalculateRouteParams,
  EventInput,
  ImportMode,
  ImportRow,
  RouteLeg,
  RouteResult,
  Stop,
  StopInput,
  YardSaleEvent,
} from "./types";

// STUB DATA LAYER.
//
// Every function below is written with the same async signature it will have
// once it's a real API call (see the `RouteOptimizer` / `GeocodeProvider`
// adapters and REST endpoints described in ROADMAP.md). For now they just
// mutate in-memory React state after a fake network delay, so the whole app
// is fully interactive without a backend. When we build the real backend,
// only the *insides* of these functions change (swap the body for a
// `fetch(...)` call) — no consuming component should need to change.

const FAKE_NETWORK_DELAY_MS = 400;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Stands in for the user's geocoded start address until Phase 4 wires up real
 * routing. Sits a little outside the event's own stops, so the fake distances
 * stay plausible whichever town the event is in — the typed-in address can't
 * be turned into coordinates without a geocoder.
 */
function pseudoStartPoint(stops: Stop[]) {
  const plotted = stops.filter((s) => s.lat != null && s.lng != null);
  if (plotted.length === 0) return DEFAULT_MAP_CENTER;

  const lat = plotted.reduce((sum, s) => sum + s.lat!, 0) / plotted.length;
  const lng = plotted.reduce((sum, s) => sum + s.lng!, 0) / plotted.length;
  return { lat: lat + 0.012, lng: lng - 0.012 };
}

function haversineMiles(a: { lat: number | null; lng: number | null }, b: { lat: number | null; lng: number | null }) {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) {
    return 1.2; // plausible fallback for stops without coordinates yet
  }
  const toRad = (d: number) => (d * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(h));
}

/** Cheap nearest-neighbor ordering, standing in for the real VROOM/OSRM solve (Phase 4). */
function nearestNeighborOrder(stops: Stop[]): Stop[] {
  if (stops.length <= 1) return [...stops];
  const remaining = [...stops];
  const ordered: Stop[] = [remaining.shift()!];
  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];
    let bestIndex = 0;
    let bestDistance = Infinity;
    remaining.forEach((candidate, index) => {
      const d = haversineMiles(last, candidate);
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = index;
      }
    });
    ordered.push(remaining.splice(bestIndex, 1)[0]);
  }
  return ordered;
}

function newId(prefix: string) {
  return `${prefix}-${(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2))}`;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<YardSaleEvent[]>(MOCK_EVENTS);
  const [stopsByEvent, setStopsByEvent] = useState<Record<string, Stop[]>>(MOCK_STOPS);

  const getEvent = useCallback((id: string) => events.find((e) => e.id === id), [events]);
  const getStops = useCallback((eventId: string) => stopsByEvent[eventId] ?? [], [stopsByEvent]);

  const createEvent = useCallback(async (input: EventInput) => {
    await delay(FAKE_NETWORK_DELAY_MS);
    const now = new Date().toISOString();
    const event: YardSaleEvent = { id: newEventId(), createdAt: now, updatedAt: now, ...input };
    setEvents((prev) => [event, ...prev]);
    setStopsByEvent((prev) => ({ ...prev, [event.id]: [] }));
    return event;
  }, []);

  const updateEvent = useCallback(async (id: string, input: EventInput) => {
    await delay(FAKE_NETWORK_DELAY_MS);
    let updated: YardSaleEvent | undefined;
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        updated = { ...e, ...input, updatedAt: new Date().toISOString() };
        return updated;
      })
    );
    if (!updated) throw new Error(`Event ${id} not found`);
    return updated;
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    await delay(FAKE_NETWORK_DELAY_MS);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setStopsByEvent((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const createStop = useCallback(async (eventId: string, input: StopInput) => {
    await delay(FAKE_NETWORK_DELAY_MS);
    const stop: Stop = {
      id: newId("stop"),
      eventId,
      geocodeStatus: "pending",
      lat: null,
      lng: null,
      ...input,
    };
    setStopsByEvent((prev) => ({ ...prev, [eventId]: [...(prev[eventId] ?? []), stop] }));
    return stop;
  }, []);

  const updateStop = useCallback(async (id: string, input: StopInput) => {
    await delay(FAKE_NETWORK_DELAY_MS);
    let updated: Stop | undefined;
    setStopsByEvent((prev) => {
      const next: Record<string, Stop[]> = {};
      for (const [eventId, stops] of Object.entries(prev)) {
        next[eventId] = stops.map((s) => {
          if (s.id !== id) return s;
          updated = { ...s, ...input };
          return updated;
        });
      }
      return next;
    });
    if (!updated) throw new Error(`Stop ${id} not found`);
    return updated;
  }, []);

  const deleteStop = useCallback(async (id: string) => {
    await delay(FAKE_NETWORK_DELAY_MS);
    setStopsByEvent((prev) => {
      const next: Record<string, Stop[]> = {};
      for (const [eventId, stops] of Object.entries(prev)) {
        next[eventId] = stops.filter((s) => s.id !== id);
      }
      return next;
    });
  }, []);

  const importStops = useCallback(async (eventId: string, rows: ImportRow[], mode: ImportMode) => {
    await delay(FAKE_NETWORK_DELAY_MS);
    // No coordinates yet: geocoding is the next piece of Phase 2, and until
    // it exists these stops are honestly marked pending rather than given
    // invented positions.
    const newStops: Stop[] = rows
      .filter((row) => row.status === "imported")
      .map((row) => ({
        id: newId("stop"),
        eventId,
        rawAddress: row.rawAddress,
        label: row.label,
        notes: row.notes,
        lat: null,
        lng: null,
        geocodeStatus: "pending" as const,
      }));

    setStopsByEvent((prev) => ({
      ...prev,
      // "replace" drops the event's current stops entirely; "append" keeps them.
      [eventId]: mode === "replace" ? newStops : [...(prev[eventId] ?? []), ...newStops],
    }));
    return newStops;
  }, []);

  const calculateRoute = useCallback(
    async ({ eventId, selectedStopIds, startAddress }: CalculateRouteParams): Promise<RouteResult> => {
      await delay(900); // stands in for the real OSRM+VROOM round trip (Phase 4)
      const allStops = stopsByEvent[eventId] ?? [];
      const selected = allStops.filter((s) => selectedStopIds.includes(s.id));
      const ordered = nearestNeighborOrder(selected);

      const start = pseudoStartPoint(allStops);
      const legs: RouteLeg[] = [];
      let totalMiles = 0;
      let cursor: { lat: number | null; lng: number | null } = start;
      let fromLabel = startAddress.trim() || "Starting address";

      for (const stop of ordered) {
        const miles = haversineMiles(cursor, stop) + 0.4; // small buffer so no leg is ever ~0
        totalMiles += miles;
        legs.push({
          fromLabel,
          toLabel: stop.label ? `${stop.rawAddress} (${stop.label})` : stop.rawAddress,
          distanceMeters: miles * 1609.34,
          durationSeconds: (miles / 25) * 3600, // ~25 mph average, neighborhood driving
        });
        cursor = { lat: stop.lat, lng: stop.lng };
        fromLabel = stop.rawAddress;
      }

      // Final leg back home.
      if (ordered.length > 0) {
        const milesHome = haversineMiles(cursor, start) + 0.4;
        totalMiles += milesHome;
        legs.push({
          fromLabel,
          toLabel: `${startAddress.trim() || "Starting address"} (return trip)`,
          distanceMeters: milesHome * 1609.34,
          durationSeconds: (milesHome / 25) * 3600,
        });
      }

      return {
        selectedStopIds,
        orderedStopIds: ordered.map((s) => s.id),
        totalDistanceMeters: totalMiles * 1609.34,
        totalDurationSeconds: (totalMiles / 25) * 3600,
        legs,
      };
    },
    [stopsByEvent]
  );

  const value = useMemo<DataContextValue>(
    () => ({
      events,
      getEvent,
      getStops,
      createEvent,
      updateEvent,
      deleteEvent,
      createStop,
      updateStop,
      deleteStop,
      importStops,
      calculateRoute,
    }),
    [
      events,
      getEvent,
      getStops,
      createEvent,
      updateEvent,
      deleteEvent,
      createStop,
      updateStop,
      deleteStop,
      importStops,
      calculateRoute,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
