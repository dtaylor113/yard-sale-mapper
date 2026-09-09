import { describe, expect, it } from "vitest";
import { buildGoogleMapsRouteLegs, MAX_WAYPOINTS_PER_LEG, type RouteLegLink } from "./google-maps";

const HOME = "9 Union St, Clinton, MA 01510";

function makeStops(count: number) {
  return Array.from({ length: count }, (_, i) => `${100 + i} High St, Clinton, MA 01510`);
}

function parseLeg(leg: RouteLegLink) {
  const params = new URL(leg.url).searchParams;
  const waypoints = params.get("waypoints");
  return {
    origin: params.get("origin"),
    destination: params.get("destination"),
    waypoints: waypoints ? waypoints.split("|") : [],
  };
}

/** Every address the driver is sent to on a leg, in order. */
function addressesVisited(leg: RouteLegLink) {
  const parsed = parseLeg(leg);
  return [...parsed.waypoints, parsed.destination!];
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

    expect(leg.url.startsWith("https://www.google.com/maps/dir/?")).toBe(true);
    expect(new URL(leg.url).searchParams.get("api")).toBe("1");
  });

  it("percent-encodes addresses so commas and spaces survive the URL", () => {
    const [leg] = buildGoogleMapsRouteLegs(HOME, makeStops(1));

    expect(leg.url).not.toMatch(/ /);
    expect(parseLeg(leg).origin).toBe(HOME);
  });

  it("keeps the whole route in one leg right up to Google's waypoint cap", () => {
    // MAX_WAYPOINTS_PER_LEG stops + the trip home fills exactly one leg.
    const legs = buildGoogleMapsRouteLegs(HOME, makeStops(MAX_WAYPOINTS_PER_LEG));

    expect(legs).toHaveLength(1);
    expect(parseLeg(legs[0]).waypoints).toHaveLength(MAX_WAYPOINTS_PER_LEG);
  });

  it("splits past the cap into legs that resume where the previous one ended", () => {
    const legs = buildGoogleMapsRouteLegs(HOME, makeStops(MAX_WAYPOINTS_PER_LEG + 3));

    expect(legs).toHaveLength(2);
    const [first, second] = legs.map(parseLeg);
    expect(second.origin).toBe(first.destination);
    expect(second.destination).toBe(HOME);
  });

  // The stop ranges drive the button labels ("stops 11-20"), so they have to
  // line up with the numbering of the ordered stop list shown beside them.
  describe("reported stop coverage", () => {
    it("counts a leg's destination as a stop, not just its waypoints", () => {
      // Easy to get wrong: a full leg drives to one more stop than it has
      // waypoints, because its destination is a stop too.
      const [first] = buildGoogleMapsRouteLegs(HOME, makeStops(32));

      expect(first.stopCount).toBe(MAX_WAYPOINTS_PER_LEG + 1);
      expect(first).toMatchObject({ firstStop: 1, lastStop: 10 });
    });

    it("splits a 32-stop route into four legs of 10, 10, 10 and 2 stops", () => {
      const legs = buildGoogleMapsRouteLegs(HOME, makeStops(32));

      expect(legs.map((leg) => [leg.firstStop, leg.lastStop])).toEqual([
        [1, 10],
        [11, 20],
        [21, 30],
        [31, 32],
      ]);
    });

    it("reports no stops on a trailing leg that only drives home", () => {
      // 10 stops fill the first leg exactly, pushing the trip home onto a leg
      // of its own that visits nothing.
      const legs = buildGoogleMapsRouteLegs(HOME, makeStops(10));

      expect(legs).toHaveLength(2);
      expect(legs[1].stopCount).toBe(0);
      expect(parseLeg(legs[1])).toMatchObject({ waypoints: [], destination: HOME });
    });
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
      expect(new Set(legs.map((leg) => leg.url)).size).toBe(legs.length);
    });

    it("respects Google's waypoint cap on every leg", () => {
      for (const leg of legs) {
        expect(parseLeg(leg).waypoints.length).toBeLessThanOrEqual(MAX_WAYPOINTS_PER_LEG);
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

    it("reports contiguous stop ranges that account for every stop", () => {
      const covering = legs.filter((leg) => leg.stopCount > 0);

      expect(covering[0].firstStop).toBe(1);
      expect(covering[covering.length - 1].lastStop).toBe(stopCount);
      expect(legs.reduce((sum, leg) => sum + leg.stopCount, 0)).toBe(stopCount);

      for (const leg of covering) {
        expect(leg.lastStop - leg.firstStop + 1).toBe(leg.stopCount);
      }
      for (let i = 1; i < covering.length; i++) {
        expect(covering[i].firstStop).toBe(covering[i - 1].lastStop + 1);
      }
    });
  });
});
