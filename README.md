# Yard Sale Mapper

A web app for organizing yard-sale **events** (e.g. a town-wide sale), importing a
spreadsheet of participating addresses, geocoding them onto a map, and planning
the fastest **round-trip driving route** through the stops you choose.

> **Status: UI-first build, no backend yet.** Every screen is real and interactive,
> driven by an in-browser data layer. Address **geocoding is live** (OpenStreetMap
> Nominatim); route optimization is still a straight-line stub; and data is
> persisted in the browser via **localStorage** until a real API/database is built.
> See [`ROADMAP.md`](./ROADMAP.md) for the full plan and what's real vs. stubbed.

## Features

- **Events** — create/edit/delete yard-sale events (admin only); public read-only browsing.
- **Spreadsheet import** — upload a `.csv` or `.xlsx`, map its columns (auto-guessed,
  user-correctable), preview, and import — choosing to replace or add to existing stops.
- **Geocoding** — batch-geocode imported addresses to coordinates via Nominatim,
  with a street-level retry when a unit designator ("Unit B", "Apt 3") trips it up.
- **Map** — Leaflet + OpenStreetMap tiles, auto-framed on the event's stops, with
  selectable pins synced to the stop list.
- **Route planning** — pick a starting address (validated by geocoding, with a
  "did you mean?" picker), select the stops to hit, and compute an ordered
  round-trip. Hand off to Google Maps via deep links (chunked into ≤9-waypoint legs).

## Getting started

```bash
npm install
npm run dev
```

Then open **http://localhost:3000** (the port is pinned).

### Admin access

Admin controls (create/edit events, import, geocode) are hidden by default. To
reveal the login, **Shift-click the 🧭 logo three times** in a row. The demo
password `yardsale` is pre-filled — just click **Log in**.

> This is a mockup-phase gate that only decides what the UI renders; it is **not**
> a security boundary. Real server-side auth is planned (see the roadmap).

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server on port 3000 |
| `npm run build` | Type-check and build the production bundle to `dist/` |
| `npm run preview` | Serve the built bundle locally |
| `npm run typecheck` | `tsc` with no emit |
| `npm run lint` | ESLint over the project |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |

## Tech stack

- **Vite + React 19 + TypeScript** single-page app, routed with **React Router**
  (client-side only — no SSR).
- **Tailwind CSS v4** (config-less, design tokens in `src/index.css`).
- **react-leaflet** + OpenStreetMap tiles for the map.
- **papaparse** (CSV) and **SheetJS `xlsx`** (Excel), the latter lazy-loaded.
- **Nominatim** for geocoding, behind a swappable adapter (`src/lib/geocode.ts`).
- **Vitest + Testing Library** for unit and component tests.

## Project structure

```
src/
  components/   UI: modals, map, stop list, route planner, header
  pages/        Route-level pages (event list, event detail)
  lib/          Domain logic + the stubbed data layer
    data-provider.tsx   In-memory state (persisted to localStorage)
    geocode.ts          Nominatim adapter + unit-strip fallback
    spreadsheet.ts      CSV/XLSX reading
    column-mapping.ts   Column guessing + address composition
    event-locale.ts     Infer the event's town for bare start addresses
    persistence.ts      localStorage load/save
    google-maps.ts      Route deep-link construction
```

The data layer (`src/lib/data-provider.tsx`) exposes async functions with the same
signatures a real REST API will have, so wiring a backend later changes their
*insides* — not the components that call them.

## Testing

```bash
npm test
```

Pure logic (spreadsheet parsing, column mapping, geocoding helpers, locale
inference, persistence) is unit-tested; the event page and route planner have
component tests via jsdom + Testing Library. There is no end-to-end/visual
coverage yet (see the roadmap).
