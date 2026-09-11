import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAdmin } from "@/lib/admin-context";
import { useData } from "@/lib/data-context";
import { eventIdFromPath, eventPath } from "@/lib/event-url";
import type { ImportMode, ImportRow, Stop } from "@/lib/types";
import { StopMap } from "@/components/stop-map";
import { StopList } from "@/components/stop-list";
import { RoutePlanner } from "@/components/route-planner";
import { EventFormModal } from "@/components/event-form-modal";
import { StopFormModal } from "@/components/stop-form-modal";
import { SpreadsheetUploadModal } from "@/components/spreadsheet-upload-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";

const STATUS_CHIPS: Record<string, string> = {
  published: "chip chip-success",
  draft: "chip chip-neutral",
  archived: "chip chip-caution",
};

const NOTHING_DESELECTED: ReadonlySet<string> = new Set();

export function EventDetailPage() {
  const { eventSlug = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const { getEvent, getStops, updateEvent, deleteEvent, createStop, updateStop, deleteStop, importStops } = useData();

  // Only the id at the end of the slug identifies the event; the words in
  // front are decorative. See lib/event-url.ts.
  const eventId = eventIdFromPath(eventSlug);
  const event = getEvent(eventId);
  const stops = getStops(eventId);

  // Tracking what the visitor *unchecked* rather than what they checked keeps
  // "everything is selected until you say otherwise" true for stops that show
  // up later too, so a spreadsheet import doesn't land 40 unchecked rows in
  // the middle of an otherwise fully selected list.
  const [selection, setSelection] = useState({ eventId, deselected: new Set<string>() });

  // Moving between events reuses this component, so the previous event's
  // unchecked stops have to be cleared out rather than carried over.
  if (selection.eventId !== eventId) {
    setSelection({ eventId, deselected: new Set() });
  }

  const deselected = selection.eventId === eventId ? selection.deselected : NOTHING_DESELECTED;
  const selectedIds = new Set(stops.filter((s) => !deselected.has(s.id)).map((s) => s.id));

  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [isDeleteEventOpen, setIsDeleteEventOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAddStopOpen, setIsAddStopOpen] = useState(false);
  const [editingStop, setEditingStop] = useState<Stop | null>(null);
  const [deletingStop, setDeletingStop] = useState<Stop | null>(null);

  if (!event) {
    return (
      <div className="rounded-card border border-dashed border-hairline bg-surface p-12 text-center">
        <p className="text-sm text-ink-muted">This event doesn&apos;t exist (or was deleted).</p>
        <Link to="/" className="btn-text mt-3 inline-block text-sm">
          ← Back to all events
        </Link>
      </div>
    );
  }

  // Renaming an event changes the slug in front of its id, so anyone arriving
  // on the old wording gets moved to the current URL. `replace` keeps the
  // stale path out of history, otherwise Back would land on it and redirect
  // forward again.
  const canonicalPath = eventPath(event);
  if (location.pathname !== canonicalPath) {
    return <Navigate to={canonicalPath} replace />;
  }

  function toggleStop(id: string) {
    setSelection((prev) => {
      const next = new Set(prev.deselected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, deselected: next };
    });
  }

  function selectAll() {
    setSelection((prev) => ({ ...prev, deselected: new Set() }));
  }

  function selectNone() {
    setSelection((prev) => ({ ...prev, deselected: new Set(stops.map((s) => s.id)) }));
  }

  async function handleEditEvent(input: Parameters<typeof updateEvent>[1]) {
    await updateEvent(eventId, input);
  }

  async function handleDeleteEvent() {
    await deleteEvent(eventId);
    setIsDeleteEventOpen(false);
    navigate("/");
  }

  async function handleAddStop(input: Parameters<typeof createStop>[1]) {
    await createStop(eventId, input);
  }

  async function handleEditStop(input: Parameters<typeof updateStop>[1]) {
    if (!editingStop) return;
    await updateStop(editingStop.id, input);
  }

  async function handleConfirmDeleteStop() {
    if (!deletingStop) return;
    await deleteStop(deletingStop.id);
    // No selection cleanup needed: it's derived from the stops that still exist.
    setDeletingStop(null);
  }

  async function handleImport(rows: ImportRow[], mode: ImportMode) {
    return importStops(eventId, rows, mode);
  }

  return (
    <div className="space-y-8">
      <Link to="/" className="btn-text text-sm">
        ← Back to all events
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-3xl font-semibold tracking-tight text-ink">{event.name}</h1>
            <span className={STATUS_CHIPS[event.status]}>{event.status}</span>
          </div>
          <p className="mt-2 text-sm text-ink-muted">
            {new Date(event.eventDate).toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-muted">{event.description}</p>
        </div>

        {isAdmin && (
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => setIsEditEventOpen(true)} className="btn btn-secondary">
              Edit event
            </button>
            <button type="button" onClick={() => setIsDeleteEventOpen(true)} className="btn btn-danger-outline">
              Delete
            </button>
          </div>
        )}
      </div>

      <StopMap stops={stops} selectedIds={selectedIds} onToggle={toggleStop} />

      {isAdmin && (
        <div className="flex gap-2">
          <button type="button" onClick={() => setIsAddStopOpen(true)} className="btn btn-secondary">
            + Add Stop
          </button>
          <button type="button" onClick={() => setIsUploadOpen(true)} className="btn btn-secondary">
            ⬆ Upload Spreadsheet
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <StopList
          stops={stops}
          selectedIds={selectedIds}
          onToggle={toggleStop}
          onSelectAll={selectAll}
          onSelectNone={selectNone}
          isAdmin={isAdmin}
          onEdit={(stop) => setEditingStop(stop)}
          onDelete={(stop) => setDeletingStop(stop)}
        />

        <RoutePlanner eventId={event.id} stops={stops} selectedIds={selectedIds} />
      </div>

      <EventFormModal
        isOpen={isEditEventOpen}
        onClose={() => setIsEditEventOpen(false)}
        onSubmit={handleEditEvent}
        initialEvent={event}
      />

      <ConfirmDialog
        isOpen={isDeleteEventOpen}
        title="Delete event?"
        message={`This will permanently delete "${event.name}" and all of its stops.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteEvent}
        onCancel={() => setIsDeleteEventOpen(false)}
      />

      <StopFormModal isOpen={isAddStopOpen} onClose={() => setIsAddStopOpen(false)} onSubmit={handleAddStop} />

      <StopFormModal
        isOpen={editingStop !== null}
        onClose={() => setEditingStop(null)}
        onSubmit={handleEditStop}
        initialStop={editingStop ?? undefined}
      />

      <ConfirmDialog
        isOpen={deletingStop !== null}
        title="Delete stop?"
        message={`Remove "${deletingStop?.rawAddress}" from this event?`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDeleteStop}
        onCancel={() => setDeletingStop(null)}
      />

      <SpreadsheetUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onImport={handleImport}
        existingStopCount={stops.length}
      />
    </div>
  );
}
