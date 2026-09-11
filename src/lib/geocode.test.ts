import { describe, expect, it } from "vitest";
import { buildNominatimUrl, parseNominatimResults, stripSecondaryUnit } from "./geocode";

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
