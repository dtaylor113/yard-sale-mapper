import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataContext, type DataContextValue } from "@/lib/data-context";
import type { GeocodeCandidate } from "@/lib/geocode";
import type { RouteResult, Stop } from "@/lib/types";
import { RoutePlanner } from "./route-planner";

function stop(id: string, rawAddress: string, coords: { lat: number; lng: number } | null): Stop {
  return {
    id,
    eventId: "e1",
    rawAddress,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    geocodeStatus: coords ? "ok" : "pending",
  };
}

const LOCATED_STOPS: Stop[] = [
  stop("s1", "12 High St, Clinton, MA 01510", { lat: 42.41, lng: -71.68 }),
  stop("s2", "44 Water St, Clinton, MA 01510", { lat: 42.42, lng: -71.67 }),
];

const ROUTE_RESULT: RouteResult = {
  selectedStopIds: ["s1", "s2"],
  orderedStopIds: ["s1", "s2"],
  totalDistanceMeters: 1609.34,
  totalDurationSeconds: 600,
  legs: [],
};

function candidate(displayName: string, lat: number, lng: number): GeocodeCandidate {
  return { lat, lng, displayName };
}

function makeData(overrides: Partial<DataContextValue> = {}): DataContextValue {
  return {
    events: [],
    getEvent: vi.fn(),
    getStops: vi.fn(() => []),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    createStop: vi.fn(),
    updateStop: vi.fn(),
    deleteStop: vi.fn(),
    importStops: vi.fn(),
    geocodeAddress: vi.fn(async () => []),
    geocodeEventStops: vi.fn(async () => ({ located: 0, failed: 0 })),
    calculateRoute: vi.fn(async () => ROUTE_RESULT),
    ...overrides,
  } as DataContextValue;
}

function renderPlanner(
  data: DataContextValue,
  props: { stops?: Stop[]; selectedIds?: Set<string>; configuredLocation?: string } = {},
) {
  const stops = props.stops ?? LOCATED_STOPS;
  const selectedIds = props.selectedIds ?? new Set(stops.map((s) => s.id));
  return render(
    <DataContext.Provider value={data}>
      <RoutePlanner
        eventId="e1"
        stops={stops}
        selectedIds={selectedIds}
        configuredLocation={props.configuredLocation ?? "Clinton, MA 01510"}
      />
    </DataContext.Provider>,
  );
}

const calculateButton = () => screen.getByRole("button", { name: /Calculate Route/i });

describe("RoutePlanner", () => {
  it("tells the user which town a bare start address is assumed to be in", () => {
    renderPlanner(makeData());
    expect(screen.getByText(/assumed to be in Clinton, MA 01510/i)).toBeInTheDocument();
  });

  it("shows a not-found error and doesn't route when the address doesn't resolve", async () => {
    const user = userEvent.setup();
    const geocodeAddress = vi.fn(async () => [] as GeocodeCandidate[]);
    const calculateRoute = vi.fn(async () => ROUTE_RESULT);
    renderPlanner(makeData({ geocodeAddress, calculateRoute }));

    await user.type(screen.getByRole("textbox"), "somewhere nonexistent");
    await user.click(calculateButton());

    expect(await screen.findByText(/couldn't find/i)).toBeInTheDocument();
    expect(calculateRoute).not.toHaveBeenCalled();
  });

  it("offers a did-you-mean picker for an ambiguous address, then routes from the pick", async () => {
    const user = userEvent.setup();
    const first = candidate("12 Main St, Clinton, MA, USA", 42.4, -71.68);
    const second = candidate("12 Main St, Sterling, MA, USA", 42.43, -71.76);
    const geocodeAddress = vi.fn(async () => [first, second]);
    const calculateRoute = vi.fn(async () => ROUTE_RESULT);
    renderPlanner(makeData({ geocodeAddress, calculateRoute }));

    await user.type(screen.getByRole("textbox"), "12 Main St");
    await user.click(calculateButton());

    expect(await screen.findByText(/which starting address did you mean/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: first.displayName }));

    expect(calculateRoute).toHaveBeenCalledWith(
      expect.objectContaining({ startLat: first.lat, startLng: first.lng }),
    );
    expect(await screen.findByText(/Total distance/i)).toBeInTheDocument();
  });

  it("warns that selected stops without a location will be skipped", () => {
    const stops = [
      stop("s1", "12 High St, Clinton, MA 01510", { lat: 42.41, lng: -71.68 }),
      stop("s2", "44 Water St, Clinton, MA 01510", null), // not located
    ];
    renderPlanner(makeData(), { stops, selectedIds: new Set(["s1", "s2"]) });

    expect(screen.getByText(/1 selected stop .*isn.t located yet/i)).toBeInTheDocument();
  });

  it("blocks a calculation when none of the selected stops are located", async () => {
    const user = userEvent.setup();
    const geocodeAddress = vi.fn(async () => [candidate("x", 1, 2)]);
    const stops = [stop("s1", "12 High St, Clinton, MA 01510", null)];
    renderPlanner(makeData({ geocodeAddress }), { stops, selectedIds: new Set(["s1"]) });

    await user.type(screen.getByRole("textbox"), "12 High St");
    await user.click(calculateButton());

    expect(await screen.findByText(/None of the selected stops have a location/i)).toBeInTheDocument();
    expect(geocodeAddress).not.toHaveBeenCalled();
  });
});
