"use client";

import { useState } from "react";
import { useAdmin } from "@/lib/admin-context";
import { useData } from "@/lib/data-context";
import type { EventInput, YardSaleEvent } from "@/lib/types";
import { EventCard } from "@/components/event-card";
import { EventFormModal } from "@/components/event-form-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function HomePage() {
  const { isAdmin } = useAdmin();
  const { events, getStops, createEvent, updateEvent, deleteEvent } = useData();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<YardSaleEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<YardSaleEvent | null>(null);

  // Regular visitors only ever see published events; admins see everything
  // (including drafts/archived) so they can manage them.
  const visibleEvents = isAdmin ? events : events.filter((e) => e.status === "published");

  async function handleCreate(input: EventInput) {
    await createEvent(input);
  }

  async function handleUpdate(input: EventInput) {
    if (!editingEvent) return;
    await updateEvent(editingEvent.id, input);
  }

  async function handleConfirmDelete() {
    if (!deletingEvent) return;
    await deleteEvent(deletingEvent.id);
    setDeletingEvent(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yard Sale Events</h1>
          <p className="mt-1 text-sm text-gray-500">
            Pick an event to see participating addresses and plan your driving route.
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + New Event
          </button>
        )}
      </div>

      {visibleEvents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          No events yet.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              stopCount={getStops(event.id).length}
              isAdmin={isAdmin}
              onEdit={() => setEditingEvent(event)}
              onDelete={() => setDeletingEvent(event)}
            />
          ))}
        </div>
      )}

      <EventFormModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSubmit={handleCreate} />

      <EventFormModal
        isOpen={editingEvent !== null}
        onClose={() => setEditingEvent(null)}
        onSubmit={handleUpdate}
        initialEvent={editingEvent ?? undefined}
      />

      <ConfirmDialog
        isOpen={deletingEvent !== null}
        title="Delete event?"
        message={`This will permanently delete "${deletingEvent?.name}" and all of its stops.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingEvent(null)}
      />
    </div>
  );
}
