import { useState } from "react";
import type { EventInput, EventStatus, YardSaleEvent } from "@/lib/types";
import { Modal } from "./modal";

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: EventInput) => Promise<void>;
  /** Pass an existing event to edit it; omit to create a new one. */
  initialEvent?: YardSaleEvent;
}

const EMPTY_INPUT: EventInput = { name: "", description: "", eventDate: "", status: "draft" };

export function EventFormModal({ isOpen, onClose, onSubmit, initialEvent }: EventFormModalProps) {
  return (
    <Modal title={initialEvent ? "Edit Event" : "New Event"} isOpen={isOpen} onClose={onClose}>
      {/* Only mounted while open, so its form state always initializes fresh
          from `initialEvent` (via useState's lazy initializer) instead of
          needing a setState-in-effect to reset it on reopen. */}
      {isOpen && <EventFormFields onClose={onClose} onSubmit={onSubmit} initialEvent={initialEvent} />}
    </Modal>
  );
}

function EventFormFields({
  onClose,
  onSubmit,
  initialEvent,
}: Omit<EventFormModalProps, "isOpen">) {
  const [form, setForm] = useState<EventInput>(() =>
    initialEvent
      ? {
          name: initialEvent.name,
          description: initialEvent.description,
          eventDate: initialEvent.eventDate,
          status: initialEvent.status,
        }
      : EMPTY_INPUT
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit(form);
    setIsSubmitting(false);
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="field-label">Event name</label>
        <input
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Maple Grove Town-Wide Yard Sale"
          className="field"
        />
      </div>

      <div>
        <label className="field-label">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={3}
          placeholder="What's this yard sale about?"
          className="field"
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="field-label">Event date</label>
          <input
            type="date"
            required
            value={form.eventDate}
            onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
            className="field"
          />
        </div>
        <div className="flex-1">
          <label className="field-label">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as EventStatus }))}
            className="field"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className="btn btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="btn btn-primary">
          {isSubmitting ? "Saving…" : initialEvent ? "Save changes" : "Create event"}
        </button>
      </div>
    </form>
  );
}
