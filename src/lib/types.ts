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
  createdAt: string;
  updatedAt: string;
}

export interface EventInput {
  name: string;
  description: string;
  eventDate: string;
  status: EventStatus;
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

export interface ImportRow {
  rowNumber: number;
  rawAddress: string;
  label?: string;
  status: "success" | "failed";
  error?: string;
}

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
}
