import { describe, expect, it } from "vitest";
import { parseStoredState, serializeState, type PersistedState } from "./persistence";
import type { Stop } from "./types";

const stop: Stop = {
  id: "s1",
  eventId: "e1",
  rawAddress: "12 High St, Clinton, MA 01510",
  lat: 42.41,
  lng: -71.68,
  geocodeStatus: "ok",
};

const state: PersistedState = {
  events: [
    {
      id: "e1",
      name: "Clinton Town-Wide Yard Sale",
      description: "",
      eventDate: "2026-09-20",
      status: "published",
      createdAt: "2026-08-01T12:00:00.000Z",
      updatedAt: "2026-09-01T09:30:00.000Z",
    },
  ],
  stopsByEvent: { e1: [stop] },
};

describe("serialize/parse round-trip", () => {
  it("restores exactly what was saved", () => {
    expect(parseStoredState(serializeState(state))).toEqual(state);
  });

  it("tags the payload with a version", () => {
    expect(JSON.parse(serializeState(state)).version).toBe(1);
  });
});

describe("parseStoredState guards", () => {
  it("returns null for missing storage", () => {
    expect(parseStoredState(null)).toBeNull();
  });

  it("returns null for unparseable JSON", () => {
    expect(parseStoredState("{not json")).toBeNull();
  });

  it("returns null for a different version, so old data reseeds instead of crashing", () => {
    const stale = JSON.stringify({ version: 0, events: [], stopsByEvent: {} });
    expect(parseStoredState(stale)).toBeNull();
  });

  it("returns null when the shape is wrong", () => {
    expect(parseStoredState(JSON.stringify({ version: 1, events: "nope", stopsByEvent: {} }))).toBeNull();
    expect(parseStoredState(JSON.stringify({ version: 1, events: [], stopsByEvent: null }))).toBeNull();
    expect(parseStoredState(JSON.stringify({ version: 1 }))).toBeNull();
  });

  it("accepts a well-formed empty state", () => {
    expect(parseStoredState(JSON.stringify({ version: 1, events: [], stopsByEvent: {} }))).toEqual({
      events: [],
      stopsByEvent: {},
    });
  });
});
