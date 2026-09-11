// Shared domain types for Yard Sale Mapper.
// These mirror the "Data Model (v1)" section of ROADMAP.md so that swapping
// the mock/stub data layer (see data-context.tsx) for real API calls later
// doesn't require changing any component code.

export type EventStatus = "draft" | "published" | "archived";

export interface YardSaleEvent {
  id: string;
  name: string;
  description: string;
  eventDate: string; // ISO date string, e.g. "2026-09-20"
  status: EventStatus;
  /**
   * Optional "City, ST ZIP" (or looser town/area) the event is centered on.
   * Used to complete a bare starting address on the route planner; falls back
   * to inferring the town from the event's stops when left blank.
   */
  defaultLocation?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventInput {
  name: string;
  description: string;
  eventDate: string;
  status: EventStatus;
  defaultLocation?: string;
}

export type GeocodeStatus = "pending" | "ok" | "failed";

export interface Stop {
  id: string;
  eventId: string;
  rawAddress: string;
  label?: string;
  notes?: string;
  /** Illustrative-only coordinates for the map placeholder; not real geocoding yet. */
  lat: number | null;
  lng: number | null;
  geocodeStatus: GeocodeStatus;
}

export interface StopInput {
  rawAddress: string;
  label?: string;
  notes?: string;
}

/**
 * One row of an uploaded spreadsheet, after parsing and column mapping.
 * Says nothing about geocoding — imported stops arrive as `pending` and get
 * their coordinates afterwards.
 */
export interface ImportRow {
  /** 1-based row number in the user's file, counting the header, so they can find it. */
  rowNumber: number;
  rawAddress: string;
  label?: string;
  notes?: string;
  status: "imported" | "skipped";
  /** Why a skipped row was skipped. */
  reason?: string;
}

/**
 * What an import does with the stops the event already has.
 * "append" adds to them; "replace" swaps them out entirely.
 */
export type ImportMode = "append" | "replace";

export interface RouteLeg {
  fromLabel: string;
  toLabel: string;
  distanceMeters: number;
  durationSeconds: number;
}

export interface RouteResult {
  selectedStopIds: string[];
  orderedStopIds: string[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  legs: RouteLeg[];
}

export interface CalculateRouteParams {
  eventId: string;
  selectedStopIds: string[];
  startAddress: string;
  /** The geocoded starting point, once the address has been resolved. */
  startLat?: number;
  startLng?: number;
}
