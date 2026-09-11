import { useState } from "react";
import {
  buildImportRows,
  FIELD_LABELS,
  guessColumnMapping,
  type ColumnMapping,
  type MappableField,
} from "@/lib/column-mapping";
import { isSupportedSpreadsheet, readSpreadsheet, SpreadsheetError, type SheetTable } from "@/lib/spreadsheet";
import type { ImportMode, ImportRow } from "@/lib/types";
import { Modal } from "./modal";

interface SpreadsheetUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (rows: ImportRow[], mode: ImportMode) => Promise<unknown>;
  /** How many stops the event already has, so we can offer to replace them. */
  existingStopCount: number;
}

type Step = "select" | "reading" | "mapping" | "importing" | "report";

const PREVIEW_ROWS = 5;
const MAPPABLE_FIELDS: MappableField[] = ["address", "city", "state", "zip", "label", "notes"];

export function SpreadsheetUploadModal({ isOpen, onClose, onImport, existingStopCount }: SpreadsheetUploadModalProps) {
  const [step, setStep] = useState<Step>("select");
  const [file, setFile] = useState<File | null>(null);
  const [table, setTable] = useState<SheetTable | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [mode, setMode] = useState<ImportMode>("replace");
  const [error, setError] = useState<string | null>(null);

  // The parsed/mapped rows, computed once per render (walking the sheet twice —
  // for the preview and the count — was wasteful). The preview is just its head.
  const mappedRows = table && mapping ? buildImportRows(table, mapping) : [];

  function reset() {
    setStep("select");
    setFile(null);
    setTable(null);
    setMapping(null);
    setRows([]);
    setMode("replace");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function readFile(chosen: File, forceHeaderRow?: boolean) {
    setFile(chosen);
    setError(null);
    setStep("reading");
    try {
      const parsed = await readSpreadsheet(chosen, forceHeaderRow);
      setTable(parsed);
      // Re-guess on a header-row change: the headers themselves just changed.
      setMapping(guessColumnMapping(parsed.headers));
      setStep("mapping");
    } catch (e) {
      setError(e instanceof SpreadsheetError ? e.message : "Couldn't read that file. Is it a valid CSV or workbook?");
      setStep("select");
    }
  }

  async function handleImport() {
    if (!table || !mapping) return;
    setRows(mappedRows);
    setStep("importing");
    await onImport(mappedRows, mode);
    setStep("report");
  }

  function setField(field: MappableField, index: number | null) {
    setMapping((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [field]: index };
      // One column can only mean one thing, so assigning it here releases it
      // from wherever it was before.
      if (index !== null) {
        for (const other of MAPPABLE_FIELDS) {
          if (other !== field && next[other] === index) next[other] = null;
        }
      }
      return next;
    });
  }

  const previewRows = mappedRows.slice(0, PREVIEW_ROWS);
  const willImport = mappedRows.filter((r) => r.status === "imported").length;
  const importedCount = rows.filter((r) => r.status === "imported").length;
  const skipped = rows.filter((r) => r.status === "skipped");

  return (
    <Modal title="Upload Spreadsheet of Addresses" isOpen={isOpen} onClose={handleClose} widthClassName="max-w-2xl">
      {step === "select" && (
        <div className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-card border border-dashed border-hairline bg-surface-sunken px-4 py-12 text-center transition-colors duration-150 hover:border-accent hover:bg-accent-soft">
            <span className="text-3xl">📄</span>
            <span className="mt-3 text-sm font-medium text-ink">
              Drag &amp; drop a .csv or .xlsx file, or click to browse
            </span>
            <span className="mt-1.5 text-xs text-ink-subtle">
              You&apos;ll get to check which column is which before anything is imported
            </span>
            <input
              type="file"
              accept=".csv,.tsv,.txt,.xlsx,.xlsm,.xlsb,.xls,.ods"
              className="hidden"
              onChange={(e) => {
                const chosen = e.target.files?.[0];
                // Clear the input so re-picking the same file after an error
                // still fires a change event.
                e.target.value = "";
                if (!chosen) return;
                if (!isSupportedSpreadsheet(chosen.name)) {
                  setError(`"${chosen.name}" isn't a spreadsheet. Upload a CSV or an Excel workbook.`);
                  return;
                }
                void readFile(chosen);
              }}
            />
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end">
            <button type="button" onClick={handleClose} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === "reading" && (
        <div className="flex flex-col items-center gap-3 py-12 text-sm text-ink-muted">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-hairline border-t-accent" />
          Reading {file?.name}…
        </div>
      )}

      {step === "mapping" && table && mapping && (
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            <span className="font-medium text-ink">{file?.name}</span>
            {table.sheetName && <> · sheet &ldquo;{table.sheetName}&rdquo;</>} · {table.rows.length}{" "}
            {table.rows.length === 1 ? "row" : "rows"}
          </p>

          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={table.hasHeaderRow}
              onChange={(e) => file && void readFile(file, e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            First row is column headings
          </label>

          <div className="grid grid-cols-2 gap-3">
            {MAPPABLE_FIELDS.map((field) => (
              <label key={field} className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-ink-muted">
                  {FIELD_LABELS[field]}
                  {field === "address" && <span className="text-danger"> *</span>}
                </span>
                <select
                  value={mapping[field] ?? ""}
                  onChange={(e) => setField(field, e.target.value === "" ? null : Number(e.target.value))}
                  className="w-full rounded-field border border-hairline bg-surface px-3 py-2 text-sm text-ink"
                >
                  <option value="">— none —</option>
                  {table.headers.map((header, index) => (
                    <option key={index} value={index}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-ink-muted">
              Preview — this is the address each row will be geocoded by:
            </p>
            <div className="overflow-hidden rounded-field border border-hairline">
              <table className="w-full text-left text-sm">
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={row.rowNumber} className="border-b border-hairline last:border-b-0">
                      <td className="w-12 px-3 py-2 text-xs text-ink-subtle">{row.rowNumber}</td>
                      <td className="px-3 py-2 text-ink">
                        {row.status === "imported" ? (
                          <>
                            {row.rawAddress}
                            {row.label && <span className="text-ink-subtle"> · {row.label}</span>}
                          </>
                        ) : (
                          <span className="text-ink-subtle italic">{row.reason}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {table.rows.length > PREVIEW_ROWS && (
              <p className="mt-1.5 text-xs text-ink-subtle">
                …and {table.rows.length - PREVIEW_ROWS} more.
              </p>
            )}
          </div>

          {existingStopCount > 0 && (
            <fieldset className="rounded-field border border-hairline p-3">
              <legend className="px-1 text-xs font-medium text-ink-muted">
                This event already has {existingStopCount} {existingStopCount === 1 ? "stop" : "stops"}
              </legend>
              <div className="flex flex-col gap-2">
                <label className="flex items-start gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name="import-mode"
                    checked={mode === "replace"}
                    onChange={() => setMode("replace")}
                    className="mt-0.5 h-4 w-4 accent-accent"
                  />
                  <span>
                    Replace all existing stops
                    <span className="block text-xs text-caution">
                      Removes the {existingStopCount} current {existingStopCount === 1 ? "stop" : "stops"} before
                      importing.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name="import-mode"
                    checked={mode === "append"}
                    onChange={() => setMode("append")}
                    className="mt-0.5 h-4 w-4 accent-accent"
                  />
                  <span>
                    Add to existing stops
                    <span className="block text-xs text-ink-subtle">
                      Keep the {existingStopCount} already here and append the new ones.
                    </span>
                  </span>
                </label>
              </div>
            </fieldset>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-xs text-ink-subtle">
              {willImport} of {mappedRows.length} rows will be imported
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={reset} className="btn btn-secondary">
                Choose another file
              </button>
              <button type="button" disabled={willImport === 0} onClick={handleImport} className="btn btn-primary">
                {mode === "replace" && existingStopCount > 0 ? "Replace with" : "Import"} {willImport}{" "}
                {willImport === 1 ? "stop" : "stops"}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "importing" && (
        <div className="flex flex-col items-center gap-3 py-12 text-sm text-ink-muted">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-hairline border-t-accent" />
          Adding stops…
        </div>
      )}

      {step === "report" && (
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">
            {mode === "replace" ? "Replaced the event\u2019s stops — imported " : "Imported "}
            <span className="font-medium text-success">{importedCount} stops</span>
            {skipped.length > 0 && (
              <>
                {" "}
                — <span className="font-medium text-caution">{skipped.length} rows skipped</span>
              </>
            )}
            . They have no coordinates yet, so they aren&apos;t on the map until geocoding runs.
          </p>

          {skipped.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded-field border border-hairline">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-surface-sunken text-xs font-medium text-ink-muted">
                  <tr>
                    <th className="px-4 py-2.5">Row</th>
                    <th className="px-4 py-2.5">Address</th>
                    <th className="px-4 py-2.5">Why it was skipped</th>
                  </tr>
                </thead>
                <tbody>
                  {skipped.map((row) => (
                    <tr key={row.rowNumber} className="border-t border-hairline">
                      <td className="px-4 py-2.5 text-ink-subtle">{row.rowNumber}</td>
                      <td className="px-4 py-2.5 text-ink">{row.rawAddress || "—"}</td>
                      <td className="px-4 py-2.5 text-ink-muted">{row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={reset} className="btn btn-secondary">
              Upload another file
            </button>
            <button type="button" onClick={handleClose} className="btn btn-primary">
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
