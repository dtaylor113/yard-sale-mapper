"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { MOCK_EVENTS, MOCK_STOPS } from "./mock-data";
import type {
  CalculateRouteParams,
  EventInput,
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

// Fictional town center used only so the map-placeholder / mock route math
// has *something* to measure distances against, standing in for a real
// geocoded start address until Phase 4's routing engine is wired up.
const TOWN_CENTER = { lat: 42.361, lng: -71.058 };

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

interface DataContextValue {
  events: YardSaleEvent[];
  getEvent: (id: string) => YardSaleEvent | undefined;
  getStops: (eventId: string) => Stop[];
  createEvent: (input: EventInput) => Promise<YardSaleEvent>;
  updateEvent: (id: string, input: EventInput) => Promise<YardSaleEvent>;
  deleteEvent: (id: string) => Promise<void>;
  createStop: (eventId: string, input: StopInput) => Promise<Stop>;
  updateStop: (id: string, input: StopInput) => Promise<Stop>;
  deleteStop: (id: string) => Promise<void>;
  importStopsFromSpreadsheet: (eventId: string, fileName: string) => Promise<ImportRow[]>;
  calculateRoute: (params: CalculateRouteParams) => Promise<RouteResult>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<YardSaleEvent[]>(MOCK_EVENTS);
  const [stopsByEvent, setStopsByEvent] = useState<Record<string, Stop[]>>(MOCK_STOPS);

  const getEvent = useCallback((id: string) => events.find((e) => e.id === id), [events]);
  const getStops = useCallback((eventId: string) => stopsByEvent[eventId] ?? [], [stopsByEvent]);

  const createEvent = useCallback(async (input: EventInput) => {
    await delay(FAKE_NETWORK_DELAY_MS);
    const now = new Date().toISOString();
    const event: YardSaleEvent = { id: newId("event"), createdAt: now, updatedAt: now, ...input };
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

  const importStopsFromSpreadsheet = useCallback(async (eventId: string, fileName: string) => {
    await delay(1200); // spreadsheet parsing + batch geocoding will genuinely take a moment for real
    const rowCount = 6 + (fileName.length % 6); // deterministic-ish "row count" from the filename
    const rows: ImportRow[] = [];
    const newStops: Stop[] = [];
    for (let i = 0; i < rowCount; i++) {
      const failed = i % 5 === 4; // roughly 1 in 5 rows "fails" to geocode
      const rawAddress = `${200 + i * 3} Import Row ${i + 1} Ln, Maple Grove, MA`;
      if (failed) {
        rows.push({ rowNumber: i + 1, rawAddress, status: "failed", error: "Could not geocode address" });
      } else {
        const stop: Stop = {
          id: newId("stop"),
          eventId,
          rawAddress,
          lat: TOWN_CENTER.lat + (i % 7) * 0.002,
          lng: TOWN_CENTER.lng + (i % 5) * 0.002,
          geocodeStatus: "ok",
        };
        newStops.push(stop);
        rows.push({ rowNumber: i + 1, rawAddress, status: "success" });
      }
    }
    setStopsByEvent((prev) => ({ ...prev, [eventId]: [...(prev[eventId] ?? []), ...newStops] }));
    return rows;
  }, []);

  const calculateRoute = useCallback(
    async ({ eventId, selectedStopIds, startAddress }: CalculateRouteParams): Promise<RouteResult> => {
      await delay(900); // stands in for the real OSRM+VROOM round trip (Phase 4)
      const allStops = stopsByEvent[eventId] ?? [];
      const selected = allStops.filter((s) => selectedStopIds.includes(s.id));
      const ordered = nearestNeighborOrder(selected);

      const legs: RouteLeg[] = [];
      let totalMiles = 0;
      let cursor: { lat: number | null; lng: number | null } = TOWN_CENTER;
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
        const milesHome = haversineMiles(cursor, TOWN_CENTER) + 0.4;
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
      importStopsFromSpreadsheet,
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
      importStopsFromSpreadsheet,
      calculateRoute,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error("useData must be used within a DataProvider");
  }
  return ctx;
}
