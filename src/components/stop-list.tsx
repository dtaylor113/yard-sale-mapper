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
    <div className="card flex flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-hairline px-5 py-3">
        <span className="text-sm font-medium text-ink">
          {selectedIds.size} of {stops.length} selected
        </span>
        <div className="flex gap-4 text-xs">
          <button type="button" onClick={onSelectAll} className="btn-text">
            Select all
          </button>
          <button type="button" onClick={onSelectNone} className="btn-text text-ink-muted hover:text-ink">
            Select none
          </button>
        </div>
      </div>

      {/* Grows to fill the card, which the grid stretches to match the taller
          route panel beside it. `min-h-96` sets the floor for when that panel
          is short; being a scroll container is what stops the list's own
          height from driving the row taller still. */}
      <ul className="min-h-96 flex-1 divide-y divide-hairline overflow-y-auto">
        {stops.map((stop) => (
          <li key={stop.id} className="flex items-start gap-3.5 px-5 py-3 transition-colors duration-150 hover:bg-surface-sunken">
            <input
              type="checkbox"
              checked={selectedIds.has(stop.id)}
              onChange={() => onToggle(stop.id)}
              className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded accent-accent"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-ink">{stop.rawAddress}</span>
                {stop.label && <span className="chip chip-accent">{stop.label}</span>}
                {stop.geocodeStatus === "failed" && (
                  <span className="chip chip-danger" title="Could not geocode this address">
                    ⚠ geocode failed
                  </span>
                )}
              </div>
              {stop.notes && <p className="mt-1 text-xs text-ink-muted">{stop.notes}</p>}
            </div>
            {isAdmin && (
              <div className="flex shrink-0 gap-3 text-xs">
                <button type="button" onClick={() => onEdit(stop)} className="btn-text text-ink-muted hover:text-ink">
                  Edit
                </button>
                <button type="button" onClick={() => onDelete(stop)} className="btn-text text-danger hover:text-danger-hover">
                  Delete
                </button>
              </div>
            )}
          </li>
        ))}
        {stops.length === 0 && <li className="px-5 py-10 text-center text-sm text-ink-subtle">No stops yet.</li>}
      </ul>
    </div>
  );
}
