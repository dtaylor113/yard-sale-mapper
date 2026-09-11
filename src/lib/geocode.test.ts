import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildNominatimUrl,
  geocode,
  GeocodeError,
  geocodeWithUnitFallback,
  parseNominatimResults,
  stripSecondaryUnit,
  type GeocodeCandidate,
} from "./geocode";

describe("buildNominatimUrl", () => {
  it("asks for JSON, US-biased, with the query", () => {
    const url = new URL(buildNominatimUrl("12 High St, Clinton, MA"));
    expect(url.origin + url.pathname).toBe("https://nominatim.openstreetmap.org/search");
    expect(url.searchParams.get("q")).toBe("12 High St, Clinton, MA");
    expect(url.searchParams.get("format")).toBe("jsonv2");
    expect(url.searchParams.get("countrycodes")).toBe("us");
  });

  it("clamps the candidate limit to a sane range", () => {
    expect(new URL(buildNominatimUrl("x", 0)).searchParams.get("limit")).toBe("1");
    expect(new URL(buildNominatimUrl("x", 50)).searchParams.get("limit")).toBe("10");
    expect(new URL(buildNominatimUrl("x", 3)).searchParams.get("limit")).toBe("3");
  });

  it("encodes commas and spaces so the query survives the round-trip", () => {
    const raw = buildNominatimUrl("250 Grove St, Unit B, Clinton MA");
    expect(raw).toContain("q=250+Grove+St%2C+Unit+B%2C+Clinton+MA");
  });
});

describe("parseNominatimResults", () => {
  it("reads lat/lon strings into numbers and keeps the display name", () => {
    const payload = [
      { lat: "42.4183", lon: "-71.6785", display_name: "12 High St, Clinton, MA, USA" },
    ];
    expect(parseNominatimResults(payload)).toEqual([
      { lat: 42.4183, lng: -71.6785, displayName: "12 High St, Clinton, MA, USA" },
    ]);
  });

  it("preserves order, so the provider's best match stays first", () => {
    const payload = [
      { lat: "1", lon: "1", display_name: "first" },
      { lat: "2", lon: "2", display_name: "second" },
    ];
    expect(parseNominatimResults(payload).map((c) => c.displayName)).toEqual(["first", "second"]);
  });

  it("drops rows with no usable coordinates rather than emitting NaN", () => {
    const payload = [
      { lat: "not-a-number", lon: "-71.6", display_name: "bad" },
      { lat: "42.4", lon: "-71.6", display_name: "good" },
    ];
    expect(parseNominatimResults(payload)).toEqual([
      { lat: 42.4, lng: -71.6, displayName: "good" },
    ]);
  });

  it("tolerates a missing display name", () => {
    expect(parseNominatimResults([{ lat: "42.4", lon: "-71.6" }])).toEqual([
      { lat: 42.4, lng: -71.6, displayName: "" },
    ]);
  });

  it("returns nothing for an empty list or a non-array body", () => {
    expect(parseNominatimResults([])).toEqual([]);
    expect(parseNominatimResults({ error: "unavailable" })).toEqual([]);
    expect(parseNominatimResults(null)).toEqual([]);
  });
});

describe("stripSecondaryUnit", () => {
  it("drops a comma-delimited unit so the street still geocodes", () => {
    expect(stripSecondaryUnit("250 Grove St, Unit B, Clinton, MA 01510")).toBe(
      "250 Grove St, Clinton, MA 01510",
    );
  });

  it("handles the common designators", () => {
    expect(stripSecondaryUnit("12 High St, Apt 3, Clinton, MA 01510")).toBe("12 High St, Clinton, MA 01510");
    expect(stripSecondaryUnit("5 Main St Suite 200, Sterling, MA 01564")).toBe("5 Main St, Sterling, MA 01564");
    expect(stripSecondaryUnit("250 Grove St #4, Clinton, MA 01510")).toBe("250 Grove St, Clinton, MA 01510");
  });

  it("leaves an address without a unit untouched", () => {
    expect(stripSecondaryUnit("44 Water St, Clinton, MA 01510")).toBe("44 Water St, Clinton, MA 01510");
  });

  it("doesn't mistake a street name that merely contains a designator's letters", () => {
    // "Fleet" starts with "fl", "Roomy" contains "room" — neither is a designator.
    expect(stripSecondaryUnit("10 Fleet St, Clinton, MA 01510")).toBe("10 Fleet St, Clinton, MA 01510");
    expect(stripSecondaryUnit("7 Roomy Ln, Sterling, MA 01564")).toBe("7 Roomy Ln, Sterling, MA 01564");
  });
});

const candidate = (displayName: string): GeocodeCandidate => ({ lat: 1, lng: 2, displayName });

describe("geocodeWithUnitFallback", () => {
  it("returns the first result without retrying when the address resolves", async () => {
    const geocodeFn = vi.fn().mockResolvedValue([candidate("first hit")]);

    const result = await geocodeWithUnitFallback("250 Grove St, Unit B, Clinton, MA", { geocodeFn });

    expect(result).toEqual([candidate("first hit")]);
    expect(geocodeFn).toHaveBeenCalledTimes(1);
  });

  it("retries at street level when a unit designator made the first lookup miss", async () => {
    const geocodeFn = vi
      .fn()
      .mockResolvedValueOnce([]) // full address misses
      .mockResolvedValueOnce([candidate("street-level hit")]); // stripped succeeds

    const result = await geocodeWithUnitFallback("250 Grove St, Unit B, Clinton, MA", { geocodeFn });

    expect(result).toEqual([candidate("street-level hit")]);
    expect(geocodeFn).toHaveBeenCalledTimes(2);
    expect(geocodeFn.mock.calls[1][0]).toBe("250 Grove St, Clinton, MA");
  });

  it("doesn't retry when there's no unit designator to strip", async () => {
    const geocodeFn = vi.fn().mockResolvedValue([]);

    const result = await geocodeWithUnitFallback("Nowhere At All", { geocodeFn });

    expect(result).toEqual([]);
    expect(geocodeFn).toHaveBeenCalledTimes(1);
  });

  it("runs beforeRetry only when it actually retries", async () => {
    const beforeRetry = vi.fn().mockResolvedValue(undefined);

    await geocodeWithUnitFallback("44 Water St, Clinton, MA", {
      beforeRetry,
      geocodeFn: vi.fn().mockResolvedValue([candidate("hit")]),
    });
    expect(beforeRetry).not.toHaveBeenCalled();

    await geocodeWithUnitFallback("12 High St, Apt 3, Clinton, MA", {
      beforeRetry,
      geocodeFn: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([candidate("hit")]),
    });
    expect(beforeRetry).toHaveBeenCalledTimes(1);
  });

  it("passes the limit through to the geocoder", async () => {
    const geocodeFn = vi.fn().mockResolvedValue([candidate("hit")]);

    await geocodeWithUnitFallback("44 Water St", { limit: 1, geocodeFn });

    expect(geocodeFn).toHaveBeenCalledWith("44 Water St", { limit: 1, signal: undefined });
  });
});

describe("geocode", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubFetch(impl: (url: string) => unknown) {
    vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve(impl(url))));
  }

  it("returns parsed candidates from a successful response", async () => {
    stubFetch(() => ({
      ok: true,
      status: 200,
      json: async () => [{ lat: "42.4", lon: "-71.6", display_name: "12 High St, Clinton, MA" }],
    }));

    await expect(geocode("12 High St, Clinton, MA")).resolves.toEqual([
      { lat: 42.4, lng: -71.6, displayName: "12 High St, Clinton, MA" },
    ]);
  });

  it("skips the network entirely for a blank query", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(geocode("   ")).resolves.toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("throws a GeocodeError on a non-ok response", async () => {
    stubFetch(() => ({ ok: false, status: 429, json: async () => [] }));
    await expect(geocode("anywhere")).rejects.toBeInstanceOf(GeocodeError);
  });

  it("throws a GeocodeError when the network is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("failed to fetch")));
    await expect(geocode("anywhere")).rejects.toBeInstanceOf(GeocodeError);
  });

  it("re-throws an abort rather than masking it as a GeocodeError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError")));
    await expect(geocode("anywhere")).rejects.toSatisfy((e: unknown) => e instanceof DOMException);
  });

  it("throws a GeocodeError when the body isn't valid JSON", async () => {
    stubFetch(() => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    }));
    await expect(geocode("anywhere")).rejects.toBeInstanceOf(GeocodeError);
  });
});
