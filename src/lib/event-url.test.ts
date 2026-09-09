import { describe, expect, it } from "vitest";
import { eventIdFromPath, eventPath, newEventId, slugify } from "./event-url";

describe("slugify", () => {
  it("lowercases and joins words with dashes", () => {
    expect(slugify("Clinton Town-Wide Yard Sale")).toBe("clinton-town-wide-yard-sale");
  });

  it("collapses punctuation and runs of whitespace into single dashes", () => {
    expect(slugify("Clinton  Spring Cleanout (planning)")).toBe("clinton-spring-cleanout-planning");
  });

  it("keeps the base letter when stripping accents", () => {
    // Naive stripping turns "Café" into "caf" and loses the e.
    expect(slugify("Café Street Sale")).toBe("cafe-street-sale");
  });

  it("never starts or ends with a dash", () => {
    for (const name of ["  Spaced Out  ", "!!!Sale!!!", "-leading and trailing-"]) {
      const slug = slugify(name);
      expect(slug.startsWith("-")).toBe(false);
      expect(slug.endsWith("-")).toBe(false);
    }
  });

  it("returns an empty slug for a name with nothing sluggable in it", () => {
    expect(slugify("🎉🎉🎉")).toBe("");
  });

  it("caps the length without leaving a trailing dash", () => {
    const slug = slugify("The Extremely Long Annual Town Wide Neighborhood Yard Sale Event");

    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("newEventId", () => {
  it("produces a dash-free id, so the slug boundary stays unambiguous", () => {
    for (let i = 0; i < 50; i++) {
      expect(newEventId()).toMatch(/^[a-z0-9]{6}$/);
    }
  });
});

describe("eventPath and eventIdFromPath", () => {
  it("puts the readable slug in front and the id at the end", () => {
    const path = eventPath({ id: "7wm4xb", name: "Sterling Neighborhood Sale" });

    expect(path).toBe("/events/sterling-neighborhood-sale-7wm4xb");
  });

  it("falls back to a bare id when the name slugs to nothing", () => {
    expect(eventPath({ id: "7wm4xb", name: "🎉" })).toBe("/events/7wm4xb");
  });

  it("recovers the id from a slug containing plenty of dashes", () => {
    expect(eventIdFromPath("clinton-town-wide-yard-sale-3kf9q2")).toBe("3kf9q2");
  });

  it("treats a dashless segment as a bare id", () => {
    expect(eventIdFromPath("3kf9q2")).toBe("3kf9q2");
  });

  it("round-trips whatever the name throws at it", () => {
    const names = [
      "Clinton Town-Wide Yard Sale",
      "Sterling Neighborhood Sale",
      "Clinton Spring Cleanout (planning)",
      "Café & Co. — Estate Sale!",
      "2026",
      "🎉",
      "   ",
      "The Extremely Long Annual Town Wide Neighborhood Yard Sale Event of the Year",
    ];

    for (const name of names) {
      const id = newEventId();
      const path = eventPath({ id, name });
      const segment = path.replace("/events/", "");

      expect(eventIdFromPath(segment)).toBe(id);
    }
  });

  it("keeps resolving the same event after a rename", () => {
    const id = "3kf9q2";
    const before = eventPath({ id, name: "Clinton Town-Wide Yard Sale" });
    const after = eventPath({ id, name: "Lancaster Fall Sale" });

    expect(before).not.toBe(after);
    expect(eventIdFromPath(before.replace("/events/", ""))).toBe(id);
    expect(eventIdFromPath(after.replace("/events/", ""))).toBe(id);
  });
});
