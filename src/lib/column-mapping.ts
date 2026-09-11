// Working out which column holds what, and assembling an address out of them.
//
// There is no standard shape for these files. Some have one "Address" column
// holding the whole thing; most spread it over Address / City / State / Zip;
// plenty have no header row at all. So we guess, show the guess in the upload
// UI, and let the user correct it — this module is the guessing and the
// assembling, kept free of React so it can be tested directly.

import type { SheetTable } from "./spreadsheet";
import type { ImportRow } from "./types";

export type MappableField = "address" | "city" | "state" | "zip" | "label" | "notes";

/** Column index per field, or null when the file has nothing for it. */
export type ColumnMapping = Record<MappableField, number | null>;

export const EMPTY_MAPPING: ColumnMapping = {
  address: null,
  city: null,
  state: null,
  zip: null,
  label: null,
  notes: null,
};

export const FIELD_LABELS: Record<MappableField, string> = {
  address: "Street address",
  city: "City / town",
  state: "State",
  zip: "ZIP",
  label: "Label",
  notes: "Notes",
};

// Ordered most- to least-specific within each field; earlier fields claim
// their column first, so "Street Address" is taken as the address before
// "State" gets a chance to match it on a loose comparison.
const SYNONYMS: Record<MappableField, string[]> = {
  address: ["streetaddress", "addressline1", "address1", "address", "street", "addr", "location", "housenumberandstreet"],
  city: ["city", "town", "cityortown", "municipality", "village"],
  state: ["state", "province", "stateprovince", "region"],
  zip: ["zipcode", "zip", "postalcode", "postcode", "postal"],
  label: ["label", "name", "sellername", "seller", "household", "family", "resident", "title", "description"],
  notes: ["notes", "note", "comments", "comment", "details", "items", "remarks"],
};

// A column called "Email Address" is not the address we want.
const DISQUALIFIERS = ["email", "mail", "phone", "tel", "url", "website", "link"];

function normalize(header: string) {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function guessColumnMapping(headers: string[]): ColumnMapping {
  const normalized = headers.map(normalize);
  const claimed = new Set<number>();
  const mapping: ColumnMapping = { ...EMPTY_MAPPING };

  for (const field of Object.keys(SYNONYMS) as MappableField[]) {
    let bestIndex = -1;
    let bestScore = 0;

    for (let index = 0; index < normalized.length; index++) {
      const header = normalized[index];
      if (claimed.has(index) || !header) continue;
      if (field === "address" && DISQUALIFIERS.some((bad) => header.includes(bad))) continue;

      // An exact hit always beats a partial one, and among either kind the
      // more specific synonym wins — hence scoring off the synonym's position.
      const exact = SYNONYMS[field].indexOf(header);
      const partial = SYNONYMS[field].findIndex((synonym) => header.includes(synonym));
      const score = exact >= 0 ? 1000 - exact : partial >= 0 ? 100 - partial : 0;

      if (score > bestScore) {
        bestIndex = index;
        bestScore = score;
      }
    }

    if (bestIndex >= 0) {
      mapping[field] = bestIndex;
      claimed.add(bestIndex);
    }
  }

  // A file with no recognizable headers is almost always a bare list of
  // addresses, so fall back to the first column rather than mapping nothing
  // and reporting every row as unusable.
  if (mapping.address === null && headers.length > 0 && !claimed.has(0)) {
    mapping.address = 0;
  }

  return mapping;
}

/**
 * Excel stores a ZIP typed as digits as a number, so Massachusetts codes come
 * back as 1510 instead of 01510. Nothing else in the pipeline can recover the
 * missing zero, and a geocoder handed "1510, MA" will either miss or land in
 * the wrong state.
 */
export function normalizeZip(value: string) {
  const trimmed = value.trim();
  if (/^\d{1,4}$/.test(trimmed)) return trimmed.padStart(5, "0");
  // Excel does the same thing to ZIP+4 written as digits: 015101234.
  if (/^\d{5}-\d{4}$/.test(trimmed)) return trimmed;
  if (/^\d{8,9}$/.test(trimmed)) {
    const padded = trimmed.padStart(9, "0");
    return `${padded.slice(0, 5)}-${padded.slice(5)}`;
  }
  return trimmed;
}

function collapse(value: string | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/** Whole-word containment, so state "MA" doesn't match "Mall St". */
function mentions(haystack: string, needle: string) {
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(haystack);
}

/**
 * Joins the mapped columns into one geocodable line, US-style:
 * "12 High St, Clinton, MA 01510".
 *
 * Parts already present in the street column are not repeated — some exports
 * carry a complete address *and* separate city/state columns.
 */
export function composeAddress(row: string[], mapping: ColumnMapping) {
  const cell = (field: MappableField) => {
    const index = mapping[field];
    return index === null ? "" : collapse(row[index]);
  };

  const street = cell("address");
  const city = cell("city");
  const state = cell("state");
  const zip = normalizeZip(cell("zip"));

  const parts = [street];
  if (city && !mentions(street, city)) parts.push(city);

  const tail = [state && !mentions(street, state) ? state : "", zip && !mentions(street, zip) ? zip : ""]
    .filter(Boolean)
    .join(" ");
  if (tail) parts.push(tail);

  return parts.filter(Boolean).join(", ");
}

/** Loose key for spotting the same address written twice in one file. */
function duplicateKey(address: string) {
  return address.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Turns a parsed sheet plus a column mapping into the rows we'd import,
 * annotated with why any of them were left out. Nothing is geocoded here —
 * imported stops start as `pending` and get coordinates later.
 */
export function buildImportRows(table: SheetTable, mapping: ColumnMapping): ImportRow[] {
  const seen = new Map<string, number>();

  return table.rows.map((row, index) => {
    const rowNumber = table.rowNumbers[index] ?? index + 1;
    const rawAddress = composeAddress(row, mapping);
    const label = mapping.label === null ? undefined : collapse(row[mapping.label]) || undefined;
    const notes = mapping.notes === null ? undefined : collapse(row[mapping.notes]) || undefined;

    // A blank street cell alongside a filled-in city and ZIP composes to
    // something like "Clinton, MA 01510", which any geocoder will happily
    // resolve — to the middle of town. That's a stop nobody lives at, so the
    // street column has to be present in its own right.
    const hasStreet = mapping.address === null || collapse(row[mapping.address]) !== "";
    if (!rawAddress || !hasStreet) {
      return {
        rowNumber,
        rawAddress,
        label,
        notes,
        status: "skipped",
        reason: rawAddress ? "No street address in this row" : "No address in this row",
      };
    }

    const key = duplicateKey(rawAddress);
    const firstSeenAt = seen.get(key);
    if (firstSeenAt !== undefined) {
      return {
        rowNumber,
        rawAddress,
        label,
        notes,
        status: "skipped",
        reason: `Same address as row ${firstSeenAt}`,
      };
    }
    seen.set(key, rowNumber);

    return { rowNumber, rawAddress, label, notes, status: "imported" };
  });
}
