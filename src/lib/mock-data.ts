import type { Stop, YardSaleEvent } from "./types";

// Static fixture data for the UI-only mockup phase (see ROADMAP.md).
// No randomness at module scope (Math.random/Date.now) so server-rendered
// and client-rendered output always match and there are no hydration
// warnings — everything here is deterministic.

const STREET_NAMES = [
  "Maple",
  "Oak",
  "Birch",
  "Cedar",
  "Elm",
  "Willow",
  "Pine",
  "Chestnut",
  "Walnut",
  "Sycamore",
  "Magnolia",
  "Aspen",
  "Poplar",
  "Hickory",
  "Spruce",
];

const STREET_SUFFIXES = ["St", "Ave", "Ln", "Dr", "Ct", "Way"];

// "Maple Grove" is fictional, so its stops are scattered over a real
// residential stretch of the Boston suburbs — that way the map tiles show a
// plausible street grid for a town-wide yard sale instead of open water or
// downtown high-rises. Shared with the mock route math in `data-provider.tsx`
// so both agree on where town is.
export const MOCK_TOWN_CENTER = { lat: 42.2968, lng: -71.2924 };

// Deterministic pseudo-scatter around the town center, purely so the map has
// something plausible to plot. Not real geocoding.
function scatter(index: number, spread: number) {
  const angle = index * 2.399963; // golden-angle-ish spacing, deterministic
  const radius = spread * Math.sqrt((index % 23) / 23);
  return {
    lat: MOCK_TOWN_CENTER.lat + radius * Math.cos(angle),
    lng: MOCK_TOWN_CENTER.lng + radius * Math.sin(angle) * 1.3,
  };
}

function buildStops(eventId: string, count: number, spread: number): Stop[] {
  const stops: Stop[] = [];
  for (let i = 0; i < count; i++) {
    const street = STREET_NAMES[i % STREET_NAMES.length];
    const suffix = STREET_SUFFIXES[i % STREET_SUFFIXES.length];
    const houseNumber = 100 + i * 7;
    const { lat, lng } = scatter(i, spread);
    stops.push({
      id: `${eventId}-stop-${i + 1}`,
      eventId,
      rawAddress: `${houseNumber} ${street} ${suffix}, Maple Grove, MA`,
      label: i % 4 === 0 ? "Multi-family sale" : undefined,
      notes:
        i % 5 === 0
          ? "Furniture, kids' clothes, some tools"
          : i % 3 === 0
            ? "Books, records, kitchenware"
            : undefined,
      lat,
      lng,
      geocodeStatus: i % 11 === 0 ? "failed" : "ok",
    });
  }
  return stops;
}

export const MOCK_EVENTS: YardSaleEvent[] = [
  {
    id: "town-wide-maple-grove",
    name: "Maple Grove Town-Wide Yard Sale",
    description:
      "Our annual town-wide yard sale! Dozens of households across Maple Grove are participating. Upload your address to join, or plan a driving route to hit as many sales as you can.",
    eventDate: "2026-09-20",
    status: "published",
    createdAt: "2026-08-01T12:00:00.000Z",
    updatedAt: "2026-09-01T09:30:00.000Z",
  },
  {
    id: "oakwood-neighborhood-sale",
    name: "Oakwood Neighborhood Sale",
    description:
      "A smaller, cozy neighborhood sale in the Oakwood subdivision. Great for an easy Saturday morning circuit.",
    eventDate: "2026-09-27",
    status: "published",
    createdAt: "2026-08-10T12:00:00.000Z",
    updatedAt: "2026-08-10T12:00:00.000Z",
  },
  {
    id: "spring-cleanout-draft",
    name: "Spring Cleanout (planning)",
    description:
      "Draft event for next spring — not yet published. Only visible in admin mode.",
    eventDate: "2027-04-18",
    status: "draft",
    createdAt: "2026-09-05T12:00:00.000Z",
    updatedAt: "2026-09-05T12:00:00.000Z",
  },
];

export const MOCK_STOPS: Record<string, Stop[]> = {
  "town-wide-maple-grove": buildStops("town-wide-maple-grove", 32, 0.035),
  "oakwood-neighborhood-sale": buildStops("oakwood-neighborhood-sale", 6, 0.012),
  "spring-cleanout-draft": buildStops("spring-cleanout-draft", 3, 0.01),
};
