import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { isSupportedSpreadsheet, looksLikeHeaderRow, readSpreadsheet, SpreadsheetError } from "./spreadsheet";

function csvFile(contents: string, name = "addresses.csv") {
  return new File([contents], name, { type: "text/csv" });
}

/** Builds a real .xlsx in memory so the Excel path is exercised end to end. */
function xlsxFile(grid: (string | number)[][], name = "addresses.xlsx") {
  const sheet = XLSX.utils.aoa_to_sheet(grid);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Sale List");
  const buffer = XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new File([buffer], name, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

describe("isSupportedSpreadsheet", () => {
  it("accepts the formats a sale list actually arrives in", () => {
    expect(isSupportedSpreadsheet("list.csv")).toBe(true);
    expect(isSupportedSpreadsheet("List.XLSX")).toBe(true);
    expect(isSupportedSpreadsheet("old-list.xls")).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isSupportedSpreadsheet("flyer.pdf")).toBe(false);
    expect(isSupportedSpreadsheet("addresses")).toBe(false);
  });
});

describe("looksLikeHeaderRow", () => {
  it("calls a row of words a header", () => {
    expect(looksLikeHeaderRow(["Address", "City", "Zip"])).toBe(true);
  });

  it("calls a row starting with a house number data", () => {
    expect(looksLikeHeaderRow(["12 High St", "Clinton", "01510"])).toBe(false);
  });

  it("treats a blank row as neither", () => {
    expect(looksLikeHeaderRow(["", "  "])).toBe(false);
  });
});

describe("reading a CSV", () => {
  it("splits the header off from the data", async () => {
    const table = await readSpreadsheet(csvFile("Address,City\n12 High St,Clinton\n44 Water St,Clinton\n"));

    expect(table.hasHeaderRow).toBe(true);
    expect(table.headers).toEqual(["Address", "City"]);
    expect(table.rows).toEqual([
      ["12 High St", "Clinton"],
      ["44 Water St", "Clinton"],
    ]);
  });

  it("keeps the first row when the file has no header", async () => {
    const table = await readSpreadsheet(csvFile("12 High St,Clinton\n44 Water St,Clinton\n"));

    expect(table.hasHeaderRow).toBe(false);
    expect(table.headers).toEqual(["Column A", "Column B"]);
    expect(table.rows).toHaveLength(2);
  });

  it("lets the caller overrule the header guess", async () => {
    const table = await readSpreadsheet(csvFile("Address,City\n12 High St,Clinton\n"), false);

    expect(table.hasHeaderRow).toBe(false);
    expect(table.rows[0]).toEqual(["Address", "City"]);
  });

  it("honors quoted commas inside an address", async () => {
    const table = await readSpreadsheet(csvFile('Address\n"12 High St, Apt 2"\n'));
    expect(table.rows).toEqual([["12 High St, Apt 2"]]);
  });

  it("drops blank rows but remembers where the survivors were", async () => {
    const table = await readSpreadsheet(csvFile("Address\n12 High St\n\n\n44 Water St\n"));

    expect(table.rows).toEqual([["12 High St"], ["44 Water St"]]);
    // Row 2 and row 5 of the file as the user sees it.
    expect(table.rowNumbers).toEqual([2, 5]);
  });

  it("trims the empty trailing columns exports leave behind", async () => {
    const table = await readSpreadsheet(csvFile("Address,City,,\n12 High St,Clinton,,\n"));
    expect(table.headers).toEqual(["Address", "City"]);
    expect(table.rows).toEqual([["12 High St", "Clinton"]]);
  });

  it("pads short rows out to the full width", async () => {
    const table = await readSpreadsheet(csvFile("Address,City,Zip\n12 High St\n"));
    expect(table.rows[0]).toEqual(["12 High St", "", ""]);
  });

  it("refuses an empty file with an explanation", async () => {
    await expect(readSpreadsheet(csvFile("\n\n"))).rejects.toThrow(SpreadsheetError);
  });

  it("refuses a file type it can't read", async () => {
    await expect(readSpreadsheet(new File(["x"], "flyer.pdf"))).rejects.toThrow(/CSV or an Excel workbook/);
  });
});

describe("reading an Excel workbook", () => {
  it("reads the first sheet and names it", async () => {
    const table = await readSpreadsheet(
      xlsxFile([
        ["Address", "City", "Zip"],
        ["12 High St", "Clinton", "01510"],
      ]),
    );

    expect(table.sheetName).toBe("Sale List");
    expect(table.headers).toEqual(["Address", "City", "Zip"]);
    expect(table.rows).toEqual([["12 High St", "Clinton", "01510"]]);
  });

  it("reads a numeric ZIP as text, even though Excel dropped its leading zero", async () => {
    const table = await readSpreadsheet(
      xlsxFile([
        ["Address", "Zip"],
        ["12 High St", 1510],
      ]),
    );

    // Recovering the zero is normalizeZip's job; what matters here is that the
    // cell arrives as a string rather than a number.
    expect(table.rows[0][1]).toBe("1510");
  });

  it("applies the same header detection as CSV", async () => {
    const table = await readSpreadsheet(xlsxFile([["12 High St", "Clinton"]]));
    expect(table.hasHeaderRow).toBe(false);
    expect(table.rows).toEqual([["12 High St", "Clinton"]]);
  });
});
