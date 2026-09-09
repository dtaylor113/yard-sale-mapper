"use client";

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
        <label className="mb-1 block text-sm font-medium text-gray-700">Event name</label>
        <input
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Maple Grove Town-Wide Yard Sale"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={3}
          placeholder="What's this yard sale about?"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-700">Event date</label>
          <input
            type="date"
            required
            value={form.eventDate}
            onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as EventStatus }))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : initialEvent ? "Save changes" : "Create event"}
        </button>
      </div>
    </form>
  );
}
