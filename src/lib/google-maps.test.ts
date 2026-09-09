import { describe, expect, it } from "vitest";
import { buildGoogleMapsRouteLegs, MAX_STOPS_PER_LEG } from "./google-maps";

const HOME = "9 Union St, Clinton, MA 01510";

function makeStops(count: number) {
  return Array.from({ length: count }, (_, i) => `${100 + i} High St, Clinton, MA 01510`);
}

function parseLeg(url: string) {
  const params = new URL(url).searchParams;
  const waypoints = params.get("waypoints");
  return {
    origin: params.get("origin"),
    destination: params.get("destination"),
    waypoints: waypoints ? waypoints.split("|") : [],
  };
}

/** Every address the driver is sent to on a leg, in order. */
function addressesVisited(url: string) {
  const leg = parseLeg(url);
  return [...leg.waypoints, leg.destination!];
}

describe("buildGoogleMapsRouteLegs", () => {
  it("returns no legs when no stops are selected", () => {
    expect(buildGoogleMapsRouteLegs(HOME, [])).toEqual([]);
  });

  it("builds a single round trip for a short route", () => {
    const stops = makeStops(2);
    const legs = buildGoogleMapsRouteLegs(HOME, stops);

    expect(legs).toHaveLength(1);
    expect(parseLeg(legs[0])).toEqual({
      origin: HOME,
      waypoints: stops,
      destination: HOME,
    });
  });

  it("targets Google's keyless directions endpoint", () => {
    const [leg] = buildGoogleMapsRouteLegs(HOME, makeStops(3));

    expect(leg.startsWith("https://www.google.com/maps/dir/?")).toBe(true);
    expect(new URL(leg).searchParams.get("api")).toBe("1");
  });

  it("percent-encodes addresses so commas and spaces survive the URL", () => {
    const [leg] = buildGoogleMapsRouteLegs(HOME, makeStops(1));

    expect(leg).not.toMatch(/ /);
    expect(parseLeg(leg).origin).toBe(HOME);
  });

  it("keeps the whole route in one leg right up to Google's waypoint cap", () => {
    // MAX_STOPS_PER_LEG stops + the trip home fills exactly one leg.
    const legs = buildGoogleMapsRouteLegs(HOME, makeStops(MAX_STOPS_PER_LEG));

    expect(legs).toHaveLength(1);
    expect(parseLeg(legs[0]).waypoints).toHaveLength(MAX_STOPS_PER_LEG);
  });

  it("splits past the cap into legs that resume where the previous one ended", () => {
    const legs = buildGoogleMapsRouteLegs(HOME, makeStops(MAX_STOPS_PER_LEG + 3));

    expect(legs).toHaveLength(2);
    const [first, second] = legs.map(parseLeg);
    expect(second.origin).toBe(first.destination);
    expect(second.destination).toBe(HOME);
  });

  // Regression guard. This once advanced the cursor by `chunk.length - 1`,
  // which is 0 when a single address remains, so the loop spun forever and
  // froze the browser tab mid-render. Note that a stalled loop would hang this
  // suite rather than fail it, so the real protection is the fixed stride in
  // the implementation — these cases just pin the behavior it produces.
  describe.each([1, 2, 5, 8, 9, 10, 11, 19, 20, 32, 40])("a %i-stop route", (stopCount) => {
    const stops = makeStops(stopCount);
    const legs = buildGoogleMapsRouteLegs(HOME, stops);

    it("produces at least one leg and no duplicates", () => {
      expect(legs.length).toBeGreaterThan(0);
      expect(new Set(legs).size).toBe(legs.length);
    });

    it("respects Google's waypoint cap on every leg", () => {
      for (const leg of legs) {
        expect(parseLeg(leg).waypoints.length).toBeLessThanOrEqual(MAX_STOPS_PER_LEG);
      }
    });

    it("starts at home, chains leg to leg, and returns home", () => {
      const parsed = legs.map(parseLeg);

      expect(parsed[0].origin).toBe(HOME);
      expect(parsed[parsed.length - 1].destination).toBe(HOME);
      for (let i = 1; i < parsed.length; i++) {
        expect(parsed[i].origin).toBe(parsed[i - 1].destination);
      }
    });

    it("visits every selected stop exactly once", () => {
      const visited = legs.flatMap(addressesVisited);

      for (const stop of stops) {
        expect(visited.filter((address) => address === stop)).toHaveLength(1);
      }
    });
  });
});
