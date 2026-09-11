import { createContext, useContext } from "react";
import type {
  CalculateRouteParams,
  EventInput,
  ImportMode,
  ImportRow,
  RouteResult,
  Stop,
  StopInput,
  YardSaleEvent,
} from "./types";

export interface DataContextValue {
  events: YardSaleEvent[];
  getEvent: (id: string) => YardSaleEvent | undefined;
  getStops: (eventId: string) => Stop[];
  createEvent: (input: EventInput) => Promise<YardSaleEvent>;
  updateEvent: (id: string, input: EventInput) => Promise<YardSaleEvent>;
  deleteEvent: (id: string) => Promise<void>;
  createStop: (eventId: string, input: StopInput) => Promise<Stop>;
  updateStop: (id: string, input: StopInput) => Promise<Stop>;
  deleteStop: (id: string) => Promise<void>;
  /**
   * Creates a stop per imported row. Rows are already parsed and mapped by the
   * caller. `mode` decides whether the new stops are added to the event's
   * existing ones ("append") or take their place ("replace").
   */
  importStops: (eventId: string, rows: ImportRow[], mode: ImportMode) => Promise<Stop[]>;
  calculateRoute: (params: CalculateRouteParams) => Promise<RouteResult>;
}

export const DataContext = createContext<DataContextValue | null>(null);

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error("useData must be used within a DataProvider");
  }
  return ctx;
}
