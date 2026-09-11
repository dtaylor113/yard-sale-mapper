import { describe, expect, it } from "vitest";
import { deriveEventLocale, localizeStartAddress } from "./event-locale";
import type { Stop } from "./types";

function stopAt(rawAddress: string): Stop {
  return {
    id: rawAddress,
    eventId: "e1",
    rawAddress,
    lat: null,
    lng: null,
    geocodeStatus: "pending",
  };
}

describe("deriveEventLocale", () => {
  it("pulls the City, ST ZIP tail off the stops", () => {
    const stops = [stopAt("12 High St, Clinton, MA 01510"), stopAt("44 Water St, Clinton, MA 01510")];
    expect(deriveEventLocale(stops)).toBe("Clinton, MA 01510");
  });

  it("uppercases the state and copes with ZIP+4", () => {
    expect(deriveEventLocale([stopAt("8 Mall St, Sterling, ma 01564-1234")])).toBe("Sterling, MA 01564");
  });

  it("returns the most common locale when stops span more than one town", () => {
    const stops = [
      stopAt("1 A St, Clinton, MA 01510"),
      stopAt("2 B St, Clinton, MA 01510"),
      stopAt("3 C St, Sterling, MA 01564"),
    ];
    expect(deriveEventLocale(stops)).toBe("Clinton, MA 01510");
  });

  it("is null when no stop carries a parseable locale", () => {
    expect(deriveEventLocale([stopAt("12 High St")])).toBeNull();
    expect(deriveEventLocale([])).toBeNull();
  });
});

describe("localizeStartAddress", () => {
  const locale = "Clinton, MA 01510";

  it("appends the event locale to a bare street", () => {
    expect(localizeStartAddress("9 Horseshoe Lane", locale)).toBe("9 Horseshoe Lane, Clinton, MA 01510");
  });

  it("leaves an address that already has a comma alone", () => {
    expect(localizeStartAddress("9 Horseshoe Lane, Sterling", locale)).toBe("9 Horseshoe Lane, Sterling");
  });

  it("leaves an address that already has a ZIP alone", () => {
    expect(localizeStartAddress("9 Horseshoe Lane 01564", locale)).toBe("9 Horseshoe Lane 01564");
  });

  it("returns the address unchanged when there's no locale to add", () => {
    expect(localizeStartAddress("9 Horseshoe Lane", null)).toBe("9 Horseshoe Lane");
  });

  it("trims but otherwise passes an empty-ish query through", () => {
    expect(localizeStartAddress("   ", locale)).toBe("");
  });
});
