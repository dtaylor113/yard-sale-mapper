import { describe, expect, it } from "vitest";
import {
  buildImportRows,
  composeAddress,
  guessColumnMapping,
  normalizeZip,
  type ColumnMapping,
  EMPTY_MAPPING,
} from "./column-mapping";
import type { SheetTable } from "./spreadsheet";

function mappingOf(partial: Partial<ColumnMapping>): ColumnMapping {
  return { ...EMPTY_MAPPING, ...partial };
}

function tableOf(headers: string[], rows: string[][]): SheetTable {
  return {
    headers,
    rows,
    rowNumbers: rows.map((_, i) => i + 2), // as if row 1 were the header
    hasHeaderRow: true,
  };
}

describe("guessColumnMapping", () => {
  it("recognizes the usual split-address export", () => {
    expect(guessColumnMapping(["Address", "City", "State", "Zip"])).toEqual(
      mappingOf({ address: 0, city: 1, state: 2, zip: 3 }),
    );
  });

  it("ignores case, spaces and punctuation in headings", () => {
    expect(guessColumnMapping(["STREET ADDRESS", "  city  ", "State/Province", "ZIP_CODE"])).toEqual(
      mappingOf({ address: 0, city: 1, state: 2, zip: 3 }),
    );
  });

  it("takes 'Town' as the city, the way a New England list writes it", () => {
    expect(guessColumnMapping(["Address", "Town"]).city).toBe(1);
  });

  it("picks up seller names and notes as label and notes", () => {
    const mapping = guessColumnMapping(["Seller Name", "Address", "Notes"]);
    expect(mapping.label).toBe(0);
    expect(mapping.address).toBe(1);
    expect(mapping.notes).toBe(2);
  });

  it("does not mistake an email column for the street address", () => {
    expect(guessColumnMapping(["Email Address", "Home Address"]).address).toBe(1);
  });

  it("never assigns one column to two fields", () => {
    const mapping = guessColumnMapping(["Street Address", "State", "Notes"]);
    const used = Object.values(mapping).filter((v): v is number => v !== null);
    expect(new Set(used).size).toBe(used.length);
  });

  it("falls back to the first column when nothing is recognizable", () => {
    // What a headerless file looks like by the time it reaches us.
    expect(guessColumnMapping(["Column A", "Column B"]).address).toBe(0);
  });

  it("maps nothing at all for an empty header list", () => {
    expect(guessColumnMapping([])).toEqual(EMPTY_MAPPING);
  });
});

describe("normalizeZip", () => {
  it("restores the leading zero Excel eats off a Massachusetts ZIP", () => {
    expect(normalizeZip("1510")).toBe("01510");
  });

  it("leaves a well-formed ZIP alone", () => {
    expect(normalizeZip("01510")).toBe("01510");
    expect(normalizeZip("01510-1234")).toBe("01510-1234");
  });

  it("re-splits a ZIP+4 that arrived as one long number", () => {
    expect(normalizeZip("15101234")).toBe("01510-1234");
  });

  it("passes through anything that isn't a bare number", () => {
    expect(normalizeZip("K1A 0B1")).toBe("K1A 0B1");
    expect(normalizeZip("")).toBe("");
  });
});

describe("composeAddress", () => {
  const split = mappingOf({ address: 0, city: 1, state: 2, zip: 3 });

  it("joins the parts the way a geocoder expects to read them", () => {
    expect(composeAddress(["12 High St", "Clinton", "MA", "01510"], split)).toBe("12 High St, Clinton, MA 01510");
  });

  it("pads the ZIP on the way through", () => {
    expect(composeAddress(["12 High St", "Clinton", "MA", "1510"], split)).toBe("12 High St, Clinton, MA 01510");
  });

  it("returns the street column verbatim when it's the only one mapped", () => {
    expect(composeAddress(["12 High St, Clinton, MA 01510"], mappingOf({ address: 0 }))).toBe(
      "12 High St, Clinton, MA 01510",
    );
  });

  it("doesn't repeat a city and state the street column already carries", () => {
    const row = ["12 High St, Clinton, MA 01510", "Clinton", "MA", "01510"];
    expect(composeAddress(row, split)).toBe("12 High St, Clinton, MA 01510");
  });

  it("still appends a state that only looks like part of a street name", () => {
    // "Mall St" contains the letters of "MA" but does not mention the state.
    expect(composeAddress(["8 Mall St", "Sterling", "MA", "01564"], split)).toBe("8 Mall St, Sterling, MA 01564");
  });

  it("collapses the stray whitespace and line breaks exports leave behind", () => {
    expect(composeAddress([" 12   High\nSt ", "Clinton", "MA", "01510"], split)).toBe(
      "12 High St, Clinton, MA 01510",
    );
  });

  it("copes with a row missing its trailing cells", () => {
    expect(composeAddress(["12 High St", "Clinton"], split)).toBe("12 High St, Clinton");
  });

  it("is empty when the row has no address at all", () => {
    expect(composeAddress(["", "Clinton", "MA", "01510"], split)).toBe("Clinton, MA 01510");
    expect(composeAddress(["", "", "", ""], split)).toBe("");
  });
});

describe("buildImportRows", () => {
  const mapping = mappingOf({ address: 0, city: 1, state: 2, zip: 3, label: 4 });

  it("imports every usable row, carrying its label", () => {
    const table = tableOf(
      ["Address", "City", "State", "Zip", "Name"],
      [
        ["12 High St", "Clinton", "MA", "01510", "Reilly family"],
        ["44 Water St", "Clinton", "MA", "01510", ""],
      ],
    );

    expect(buildImportRows(table, mapping)).toEqual([
      { rowNumber: 2, rawAddress: "12 High St, Clinton, MA 01510", label: "Reilly family", notes: undefined, status: "imported" },
      { rowNumber: 3, rawAddress: "44 Water St, Clinton, MA 01510", label: undefined, notes: undefined, status: "imported" },
    ]);
  });

  it("cites the row number from the user's file, not its own index", () => {
    const table: SheetTable = {
      headers: ["Address"],
      rows: [["12 High St"], ["44 Water St"]],
      rowNumbers: [4, 9], // blank rows were dropped before this point
      hasHeaderRow: true,
    };
    expect(buildImportRows(table, mappingOf({ address: 0 })).map((r) => r.rowNumber)).toEqual([4, 9]);
  });

  it("skips a row with no address rather than importing an empty stop", () => {
    const table = tableOf(["Address", "City"], [["", "Clinton"]]);
    const [row] = buildImportRows(table, mappingOf({ address: 0 }));
    expect(row.status).toBe("skipped");
    expect(row.reason).toMatch(/no address/i);
  });

  it("skips a row with a town and ZIP but no street, which would geocode to the town center", () => {
    const table = tableOf(["Address", "City", "State", "Zip", "Name"], [["", "Clinton", "MA", "01510", ""]]);
    const [row] = buildImportRows(table, mapping);

    expect(row.status).toBe("skipped");
    expect(row.reason).toMatch(/no street address/i);
    // The composed address is still reported, so the user can see what the row
    // amounted to and why it wasn't good enough.
    expect(row.rawAddress).toBe("Clinton, MA 01510");
  });

  it("skips a repeat of an address already seen, and points at the original", () => {
    const table = tableOf(
      ["Address", "City", "State", "Zip", "Name"],
      [
        ["12 High St", "Clinton", "MA", "01510", ""],
        ["44 Water St", "Clinton", "MA", "01510", ""],
        ["12 HIGH ST.", "Clinton", "MA", "01510", ""],
      ],
    );

    const rows = buildImportRows(table, mapping);
    expect(rows.map((r) => r.status)).toEqual(["imported", "imported", "skipped"]);
    expect(rows[2].reason).toBe("Same address as row 2");
  });

  it("keeps two different houses on the same street", () => {
    const table = tableOf(
      ["Address", "City", "State", "Zip", "Name"],
      [
        ["12 High St", "Clinton", "MA", "01510", ""],
        ["120 High St", "Clinton", "MA", "01510", ""],
      ],
    );
    expect(buildImportRows(table, mapping).every((r) => r.status === "imported")).toBe(true);
  });
});
