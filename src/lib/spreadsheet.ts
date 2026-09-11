// Reading an uploaded address list into a plain grid of strings.
//
// Whoever organizes a town-wide sale exports their list from wherever they keep
// it — Excel, Google Sheets, a mail-merge tool — so we take both CSV and the
// Excel formats and flatten everything to `string[][]` immediately. Deciding
// which column means what is a separate job (see column-mapping.ts); this file
// only cares about getting cells out of a file intact.

import Papa from "papaparse";

export interface SheetTable {
  /** Column names, or synthesized "Column A/B/C…" when the file has no header row. */
  headers: string[];
  /** Data rows only, padded so every row has one cell per header. */
  rows: string[][];
  /**
   * Source row number of `rows[i]`, 1-based and counting the header, so the
   * import report can point at a row the user can actually find in their file.
   */
  rowNumbers: number[];
  /** Whether the first row was read as column names. */
  hasHeaderRow: boolean;
  /** Name of the worksheet the rows came from; undefined for CSV. */
  sheetName?: string;
}

export class SpreadsheetError extends Error {}

const EXCEL_EXTENSIONS = ["xlsx", "xlsm", "xlsb", "xls", "ods"];
const TEXT_EXTENSIONS = ["csv", "tsv", "txt"];

function extensionOf(fileName: string) {
  return fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase();
}

export function isSupportedSpreadsheet(fileName: string) {
  const ext = extensionOf(fileName);
  return EXCEL_EXTENSIONS.includes(ext) || TEXT_EXTENSIONS.includes(ext);
}

/**
 * A header row is words; a data row starts with a house number. That single
 * signal separates the two reliably enough for address lists, and the upload
 * UI lets the user overrule it, which is why nothing here tries to be cleverer.
 */
export function looksLikeHeaderRow(row: string[]) {
  const filled = row.map((cell) => cell.trim()).filter(Boolean);
  if (filled.length === 0) return false;
  return filled.every((cell) => !/^\d/.test(cell));
}

function columnName(index: number) {
  // Excel-style A…Z, AA…AZ, so the labels match what the user sees in their app.
  let name = "";
  for (let n = index; n >= 0; n = Math.floor(n / 26) - 1) {
    name = String.fromCharCode(65 + (n % 26)) + name;
  }
  return `Column ${name}`;
}

/** Drops trailing blank rows and columns, which spreadsheet exports are full of. */
function trimGrid(grid: string[][]) {
  const cells = grid.map((row) => row.map((cell) => (cell ?? "").trim()));

  let width = 0;
  for (const row of cells) {
    for (let i = row.length - 1; i >= 0; i--) {
      if (row[i] !== "") {
        width = Math.max(width, i + 1);
        break;
      }
    }
  }
  if (width === 0) return [];

  return cells.map((row) => Array.from({ length: width }, (_, i) => row[i] ?? ""));
}

function toTable(grid: string[][], forceHeaderRow: boolean | undefined, sheetName?: string): SheetTable {
  const trimmed = trimGrid(grid);
  // Blank rows are dropped here rather than in the parsers so that CSV and
  // Excel behave identically, but their original positions are kept so the
  // report can cite the row number the user sees in their own file.
  const numbered = trimmed
    .map((row, index) => ({ row, rowNumber: index + 1 }))
    .filter(({ row }) => row.some((cell) => cell !== ""));

  if (numbered.length === 0) {
    throw new SpreadsheetError("That file has no rows in it.");
  }

  const hasHeaderRow = forceHeaderRow ?? looksLikeHeaderRow(numbered[0].row);
  const body = hasHeaderRow ? numbered.slice(1) : numbered;

  const headers = hasHeaderRow
    ? numbered[0].row.map((cell, index) => cell || columnName(index))
    : numbered[0].row.map((_, index) => columnName(index));

  return {
    headers,
    rows: body.map(({ row }) => row),
    rowNumbers: body.map(({ rowNumber }) => rowNumber),
    hasHeaderRow,
    sheetName,
  };
}

function parseDelimitedText(text: string, forceHeaderRow?: boolean): SheetTable {
  // No `header: true` — we do our own header handling so that a file whose
  // first row is already data isn't silently eaten as column names.
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false });
  return toTable(parsed.data, forceHeaderRow);
}

async function parseWorkbook(buffer: ArrayBuffer, forceHeaderRow?: boolean): Promise<SheetTable> {
  // SheetJS is ~1MB. Loading it on demand keeps it out of the bundle that
  // every visitor downloads just to look at a map.
  const XLSX = await import("xlsx");

  // `cellDates` so a date column arrives as a Date rather than Excel's serial
  // number; `raw: false` below then renders it the way the sheet displayed it.
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new SpreadsheetError("That workbook has no sheets in it.");

  const grid = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[sheetName], {
    header: 1,
    // Take the cell's displayed text, not its underlying value, so formulas
    // and formatted numbers arrive looking the way they do on screen.
    raw: false,
    defval: "",
    blankrows: true,
  });

  return toTable(grid, forceHeaderRow, sheetName);
}

/**
 * @param forceHeaderRow overrides the header-row guess when the user corrects it.
 */
export async function readSpreadsheet(file: File, forceHeaderRow?: boolean): Promise<SheetTable> {
  const ext = extensionOf(file.name);

  if (EXCEL_EXTENSIONS.includes(ext)) {
    return parseWorkbook(await file.arrayBuffer(), forceHeaderRow);
  }
  if (TEXT_EXTENSIONS.includes(ext)) {
    return parseDelimitedText(await file.text(), forceHeaderRow);
  }
  throw new SpreadsheetError(
    `Can't read a ".${ext}" file. Upload a CSV or an Excel workbook (.xlsx).`,
  );
}
