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
          <label
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center hover:border-blue-400 hover:bg-blue-50"
          >
            <span className="text-3xl">📄</span>
            <span className="mt-2 text-sm font-medium text-gray-700">
              {fileName ?? "Drag & drop a .csv or .xlsx file, or click to browse"}
            </span>
            <span className="mt-1 text-xs text-gray-400">Column mapping happens on the next step (Phase 2)</span>
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
              className="text-xs text-blue-600 underline hover:text-blue-800"
            >
              (or click here to simulate picking &quot;sample-addresses.csv&quot;)
            </button>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!fileName}
              onClick={handleUploadClick}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Upload & geocode
            </button>
          </div>
        </div>
      )}

      {step === "uploading" && (
        <div className="flex flex-col items-center gap-3 py-10 text-sm text-gray-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          Parsing rows and geocoding addresses…
        </div>
      )}

      {step === "report" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Imported <span className="font-medium text-green-700">{successCount} stops</span>
            {failedCount > 0 && (
              <>
                {" "}
                — <span className="font-medium text-red-600">{failedCount} rows failed to geocode</span>
              </>
            )}
            .
          </p>
          <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Address</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowNumber} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-400">{row.rowNumber}</td>
                    <td className="px-3 py-2">{row.rawAddress}</td>
                    <td className="px-3 py-2">
                      {row.status === "success" ? (
                        <span className="text-green-700">✓ Geocoded</span>
                      ) : (
                        <span className="text-red-600" title={row.error}>
                          ✕ Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Upload another file
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
