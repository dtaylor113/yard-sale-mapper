import type { Stop, YardSaleEvent } from "./types";

// Static fixture data for the UI-only mockup phase (see ROADMAP.md).
// Nothing random at module scope, so the data is identical on every load.

interface MockTown {
  name: string;
  state: string;
  zip: string;
  /** Roughly the town center; stops are scattered around it. */
  center: { lat: number; lng: number };
  /** Radius of that scatter, in degrees. */
  spread: number;
  /** Real street names, so the Google Maps hand-off has a chance of resolving them. */
  streets: string[];
}

const CLINTON: MockTown = {
  name: "Clinton",
  state: "MA",
  zip: "01510",
  // Nudged east of the town line so the scatter stays over streets instead of
  // dropping pins into the Wachusett Reservoir.
  center: { lat: 42.4183, lng: -71.6785 },
  spread: 0.013,
  streets: [
    "High St",
    "Church St",
    "Water St",
    "Union St",
    "Chestnut St",
    "Walnut St",
    "Prospect St",
    "Franklin St",
    "Grove St",
    "Berlin St",
    "Oak St",
    "Green St",
    "Mechanic St",
    "Sterling St",
    "Boylston St",
    "Allen St",
    "Pleasant St",
    "Highland St",
    "Woodruff Rd",
    "Main St",
  ],
};

const STERLING: MockTown = {
  name: "Sterling",
  state: "MA",
  zip: "01564",
  center: { lat: 42.4376, lng: -71.7606 },
  spread: 0.012,
  streets: [
    "Maple St",
    "Meetinghouse Hill Rd",
    "Chocksett Rd",
    "Waushacum Ave",
    "Pratts Junction Rd",
    "Boutelle Rd",
    "Leominster Rd",
    "Clinton Rd",
    "Princeton Rd",
    "Rowley Hill Rd",
    "Kendall Hill Rd",
    "Beaman Rd",
    "Justice Hill Rd",
    "Osgood Rd",
    "Gates Rd",
    "Heywood Rd",
    "Muddy Pond Rd",
    "Newell Hill Rd",
    "Redemption Rock Trl",
    "Main St",
  ],
};

/** Only the map's pre-fit / empty-state view; it refits to the real stops. */
export const DEFAULT_MAP_CENTER = CLINTON.center;

const LABELS = ["Multi-family sale", "Estate sale", "Moving sale"];

const NOTES = [
  "Furniture, kids' clothes, some tools",
  "Books, records, kitchenware",
  "Garden equipment, bikes, camping gear",
];

const GOLDEN_ANGLE = 2.399963;

// Deterministic pseudo-scatter around the town center, so the map has
// something plausible to plot.
//
// NOTE: these coordinates do NOT correspond to the street addresses above —
// they're a spiral around the town center, not a geocode. A pin sitting on
// "High St" is a coincidence. Real correspondence arrives in Phase 2 when
// addresses actually get geocoded.
function scatter(town: MockTown, index: number, spread: number, total: number) {
  // Vogel spiral. The radius has to be strictly increasing with the index:
  // two stops sharing a radius can collide, and at radius zero the angle
  // stops mattering, so the half-step offset keeps index 0 off dead center.
  const angle = index * GOLDEN_ANGLE;
  const radius = spread * Math.sqrt((index + 0.5) / total);
  return {
    lat: town.center.lat + radius * Math.cos(angle),
    lng: town.center.lng + radius * Math.sin(angle) * 1.3,
  };
}

function addressIn(town: MockTown, index: number) {
  const street = town.streets[index % town.streets.length];
  const houseNumber = 4 + ((index * 13) % 180);
  return `${houseNumber} ${street}, ${town.name}, ${town.state} ${town.zip}`;
}

function buildStops(eventId: string, town: MockTown, count: number): Stop[] {
  const stops: Stop[] = [];
  for (let i = 0; i < count; i++) {
    // Every 11th stop "fails" to geocode, purely to exercise the error styling.
    // Failed stops carry no coordinates, same as a real failure would.
    const failed = i % 11 === 5;
    const { lat, lng } = scatter(town, i, town.spread, count);
    stops.push({
      id: `${eventId}-stop-${i + 1}`,
      eventId,
      rawAddress: addressIn(town, i),
      label: i % 4 === 0 ? LABELS[(i / 4) % LABELS.length] : undefined,
      notes: i % 3 === 0 ? NOTES[(i / 3) % NOTES.length] : undefined,
      lat: failed ? null : lat,
      lng: failed ? null : lng,
      geocodeStatus: failed ? "failed" : "ok",
    });
  }
  return stops;
}

// Fixed stand-ins for the ids a database would hand out. Short and dash-free,
// matching newEventId(), because the URL slug is split on its last dash.
const CLINTON_TOWN_WIDE_ID = "3kf9q2";
const STERLING_SALE_ID = "7wm4xb";
const SPRING_CLEANOUT_ID = "q28dhv";

export const MOCK_EVENTS: YardSaleEvent[] = [
  {
    id: CLINTON_TOWN_WIDE_ID,
    name: "Clinton Town-Wide Yard Sale",
    description:
      "Our annual town-wide yard sale! Dozens of households across Clinton are participating. Upload your address to join, or plan a driving route to hit as many sales as you can.",
    eventDate: "2026-09-20",
    status: "published",
    defaultLocation: `${CLINTON.name}, ${CLINTON.state} ${CLINTON.zip}`,
    createdAt: "2026-08-01T12:00:00.000Z",
    updatedAt: "2026-09-01T09:30:00.000Z",
  },
  {
    id: STERLING_SALE_ID,
    name: "Sterling Neighborhood Sale",
    description:
      "A smaller, cozy neighborhood sale around Sterling center. Great for an easy Saturday morning circuit.",
    eventDate: "2026-09-27",
    status: "published",
    defaultLocation: `${STERLING.name}, ${STERLING.state} ${STERLING.zip}`,
    createdAt: "2026-08-10T12:00:00.000Z",
    updatedAt: "2026-08-10T12:00:00.000Z",
  },
  {
    id: SPRING_CLEANOUT_ID,
    name: "Clinton Spring Cleanout (planning)",
    description:
      "Draft event for next spring — not yet published. Only visible in admin mode.",
    eventDate: "2027-04-18",
    status: "draft",
    defaultLocation: `${CLINTON.name}, ${CLINTON.state} ${CLINTON.zip}`,
    createdAt: "2026-09-05T12:00:00.000Z",
    updatedAt: "2026-09-05T12:00:00.000Z",
  },
];

export const MOCK_STOPS: Record<string, Stop[]> = {
  [CLINTON_TOWN_WIDE_ID]: buildStops(CLINTON_TOWN_WIDE_ID, CLINTON, 32),
  [STERLING_SALE_ID]: buildStops(STERLING_SALE_ID, STERLING, 6),
  [SPRING_CLEANOUT_ID]: buildStops(SPRING_CLEANOUT_ID, CLINTON, 3),
};

