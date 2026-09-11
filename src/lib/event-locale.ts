// Assuming the event's town for a bare starting address.
//
// Someone planning a route through the Clinton, MA sale will type "9 Horseshoe
// Lane", not "9 Horseshoe Lane, Clinton, MA 01510" — they're already thinking
// in the town's frame. The geocoder isn't: a bare street name is ambiguous
// across thousands of towns. So we infer the event's "City, ST ZIP" from the
// stops it already has and quietly append it when the user didn't spell out a
// locality themselves. Kept free of React and network calls so it's testable.

import type { Stop } from "./types";

// Matches a trailing US "City, ST ZIP" (with optional ZIP+4) at the end of an
// address, e.g. the "Clinton, MA 01510" in "12 High St, Clinton, MA 01510".
const LOCALE_TAIL = /,\s*([A-Za-z .'-]+),\s*([A-Za-z]{2})\s+(\d{5})(?:-\d{4})?\s*$/;

/**
 * Infers the event's locale ("City, ST ZIP") from the most common tail across
 * its stops' addresses, or null when none of them carry a parseable one.
 */
export function deriveEventLocale(stops: Stop[]): string | null {
  const counts = new Map<string, number>();

  for (const stop of stops) {
    const match = LOCALE_TAIL.exec(stop.rawAddress);
    if (!match) continue;
    const [, city, state, zip] = match;
    const locale = `${city.trim()}, ${state.toUpperCase()} ${zip}`;
    counts.set(locale, (counts.get(locale) ?? 0) + 1);
  }

  let best: string | null = null;
  let bestCount = 0;
  for (const [locale, count] of counts) {
    if (count > bestCount) {
      best = locale;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Appends the event locale to a starting address that doesn't already name one.
 *
 * The signal for "the user already specified a locality" is simple and
 * predictable: a comma or a ZIP. Type "9 Horseshoe Lane" and it becomes
 * "9 Horseshoe Lane, <event locale>"; type anything with a comma or ZIP and
 * it's left exactly as written, so nobody is overruled.
 */
export function localizeStartAddress(query: string, locale: string | null): string {
  const trimmed = query.trim();
  if (!locale || !trimmed) return trimmed;

  const hasZip = /\b\d{5}(?:-\d{4})?\b/.test(trimmed);
  const hasComma = trimmed.includes(",");
  if (hasZip || hasComma) return trimmed;

  return `${trimmed}, ${locale}`;
}
