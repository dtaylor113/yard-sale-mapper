"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAdmin } from "@/lib/admin-context";
import { useData } from "@/lib/data-context";
import type { Stop } from "@/lib/types";
import { MapPlaceholder } from "./map-placeholder";
import { StopList } from "./stop-list";
import { RoutePlanner } from "./route-planner";
import { EventFormModal } from "./event-form-modal";
import { StopFormModal } from "./stop-form-modal";
import { SpreadsheetUploadModal } from "./spreadsheet-upload-modal";
import { ConfirmDialog } from "./confirm-dialog";

const STATUS_STYLES: Record<string, string> = {
  published: "bg-green-100 text-green-800",
  draft: "bg-gray-100 text-gray-600",
  archived: "bg-yellow-100 text-yellow-800",
};

export function EventDetailClient({ eventId }: { eventId: string }) {
  const router = useRouter();
  const { isAdmin } = useAdmin();
  const { getEvent, getStops, updateEvent, deleteEvent, createStop, updateStop, deleteStop, importStopsFromSpreadsheet } =
    useData();

  const event = getEvent(eventId);
  const stops = getStops(eventId);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [isDeleteEventOpen, setIsDeleteEventOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAddStopOpen, setIsAddStopOpen] = useState(false);
  const [editingStop, setEditingStop] = useState<Stop | null>(null);
  const [deletingStop, setDeletingStop] = useState<Stop | null>(null);

  if (!event) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
        <p className="text-sm text-gray-500">This event doesn&apos;t exist (or was deleted).</p>
        <Link href="/" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-800">
          ← Back to all events
        </Link>
      </div>
    );
  }

  function toggleStop(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(stops.map((s) => s.id)));
  }

  function selectNone() {
    setSelectedIds(new Set());
  }

  async function handleEditEvent(input: Parameters<typeof updateEvent>[1]) {
    await updateEvent(event!.id, input);
  }

  async function handleDeleteEvent() {
    await deleteEvent(event!.id);
    setIsDeleteEventOpen(false);
    router.push("/");
  }

  async function handleAddStop(input: Parameters<typeof createStop>[1]) {
    await createStop(event!.id, input);
  }

  async function handleEditStop(input: Parameters<typeof updateStop>[1]) {
    if (!editingStop) return;
    await updateStop(editingStop.id, input);
  }

  async function handleConfirmDeleteStop() {
    if (!deletingStop) return;
    await deleteStop(deletingStop.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(deletingStop.id);
      return next;
    });
    setDeletingStop(null);
  }

  async function handleUpload(fileName: string) {
    return importStopsFromSpreadsheet(event!.id, fileName);
  }

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-800">
        ← Back to all events
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[event.status]}`}>
              {event.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {new Date(event.eventDate).toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">{event.description}</p>
        </div>

        {isAdmin && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setIsEditEventOpen(true)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit event
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteEventOpen(true)}
              className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <MapPlaceholder stops={stops} selectedStopIds={selectedIds} />

      {isAdmin && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsAddStopOpen(true)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            + Add Stop
          </button>
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
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

      <SpreadsheetUploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} onUpload={handleUpload} />
    </div>
  );
}
