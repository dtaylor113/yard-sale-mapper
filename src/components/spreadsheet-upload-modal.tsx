import { useState } from "react";
import type { ImportRow } from "@/lib/types";
import { Modal } from "./modal";

interface SpreadsheetUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (fileName: string) => Promise<ImportRow[]>;
}

type Step = "select" | "uploading" | "report";

export function SpreadsheetUploadModal({ isOpen, onClose, onUpload }: SpreadsheetUploadModalProps) {
  const [step, setStep] = useState<Step>("select");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);

  function reset() {
    setStep("select");
    setFileName(null);
    setRows([]);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFileChosen(name: string) {
    setFileName(name);
  }

  async function handleUploadClick() {
    if (!fileName) return;
    setStep("uploading");
    const result = await onUpload(fileName);
    setRows(result);
    setStep("report");
  }

  const successCount = rows.filter((r) => r.status === "success").length;
  const failedCount = rows.filter((r) => r.status === "failed").length;

  return (
    <Modal title="Upload Spreadsheet of Addresses" isOpen={isOpen} onClose={handleClose} widthClassName="max-w-xl">
      {step === "select" && (
        <div className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-card border border-dashed border-hairline bg-surface-sunken px-4 py-12 text-center transition-colors duration-150 hover:border-accent hover:bg-accent-soft">
            <span className="text-3xl">📄</span>
            <span className="mt-3 text-sm font-medium text-ink">
              {fileName ?? "Drag & drop a .csv or .xlsx file, or click to browse"}
            </span>
            <span className="mt-1.5 text-xs text-ink-subtle">Column mapping happens on the next step (Phase 2)</span>
            <input
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileChosen(f.name);
              }}
            />
          </label>

          {/* Mockup convenience: let reviewers try the flow without a real file. */}
          {!fileName && (
            <button
              type="button"
              onClick={() => handleFileChosen("sample-addresses.csv")}
              className="btn-text text-xs underline"
            >
              (or click here to simulate picking &quot;sample-addresses.csv&quot;)
            </button>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={handleClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="button" disabled={!fileName} onClick={handleUploadClick} className="btn btn-primary">
              Upload & geocode
            </button>
          </div>
        </div>
      )}

      {step === "uploading" && (
        <div className="flex flex-col items-center gap-3 py-12 text-sm text-ink-muted">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-hairline border-t-accent" />
          Parsing rows and geocoding addresses…
        </div>
      )}

      {step === "report" && (
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">
            Imported <span className="font-medium text-success">{successCount} stops</span>
            {failedCount > 0 && (
              <>
                {" "}
                — <span className="font-medium text-danger">{failedCount} rows failed to geocode</span>
              </>
            )}
            .
          </p>
          <div className="max-h-64 overflow-y-auto rounded-field border border-hairline">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface-sunken text-xs font-medium text-ink-muted">
                <tr>
                  <th className="px-4 py-2.5">Row</th>
                  <th className="px-4 py-2.5">Address</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowNumber} className="border-t border-hairline">
                    <td className="px-4 py-2.5 text-ink-subtle">{row.rowNumber}</td>
                    <td className="px-4 py-2.5 text-ink">{row.rawAddress}</td>
                    <td className="px-4 py-2.5">
                      {row.status === "success" ? (
                        <span className="text-success">✓ Geocoded</span>
                      ) : (
                        <span className="text-danger" title={row.error}>
                          ✕ Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
