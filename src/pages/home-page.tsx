import { useState } from "react";
import { useAdmin } from "@/lib/admin-context";
import { useData } from "@/lib/data-context";
import type { EventInput, YardSaleEvent } from "@/lib/types";
import { EventCard } from "@/components/event-card";
import { EventFormModal } from "@/components/event-form-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function HomePage() {
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
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Yard Sale Events</h1>
          <p className="mt-2 text-[15px] text-ink-muted">
            Pick an event to see participating addresses and plan your driving route.
          </p>
        </div>
        {isAdmin && (
          <button type="button" onClick={() => setIsCreateOpen(true)} className="btn btn-primary shrink-0">
            + New Event
          </button>
        )}
      </div>

      {visibleEvents.length === 0 ? (
        <div className="rounded-card border border-dashed border-hairline bg-surface p-12 text-center text-sm text-ink-muted">
          No events yet.
        </div>
      ) : (
        <div className="space-y-4">
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
