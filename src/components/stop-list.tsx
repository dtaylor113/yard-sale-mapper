"use client";

import type { Stop } from "@/lib/types";

interface StopListProps {
  stops: Stop[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  isAdmin: boolean;
  onEdit: (stop: Stop) => void;
  onDelete: (stop: Stop) => void;
}

export function StopList({ stops, selectedIds, onToggle, onSelectAll, onSelectNone, isAdmin, onEdit, onDelete }: StopListProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
        <span className="text-sm font-medium text-gray-700">
          {selectedIds.size} of {stops.length} selected
        </span>
        <div className="flex gap-3 text-xs font-medium">
          <button type="button" onClick={onSelectAll} className="text-blue-600 hover:text-blue-800">
            Select all
          </button>
          <button type="button" onClick={onSelectNone} className="text-gray-500 hover:text-gray-700">
            Select none
          </button>
        </div>
      </div>

      <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto">
        {stops.map((stop) => (
          <li key={stop.id} className="flex items-start gap-3 px-4 py-2.5">
            <input
              type="checkbox"
              checked={selectedIds.has(stop.id)}
              onChange={() => onToggle(stop.id)}
              className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm text-gray-900">{stop.rawAddress}</span>
                {stop.label && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{stop.label}</span>
                )}
                {stop.geocodeStatus === "failed" && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600" title="Could not geocode this address">
                    ⚠ geocode failed
                  </span>
                )}
              </div>
              {stop.notes && <p className="mt-0.5 text-xs text-gray-500">{stop.notes}</p>}
            </div>
            {isAdmin && (
              <div className="flex shrink-0 gap-2 text-xs font-medium">
                <button type="button" onClick={() => onEdit(stop)} className="text-gray-500 hover:text-gray-800">
                  Edit
                </button>
                <button type="button" onClick={() => onDelete(stop)} className="text-red-500 hover:text-red-700">
                  Delete
                </button>
              </div>
            )}
          </li>
        ))}
        {stops.length === 0 && <li className="px-4 py-6 text-center text-sm text-gray-400">No stops yet.</li>}
      </ul>
    </div>
  );
}
