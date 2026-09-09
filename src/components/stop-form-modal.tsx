import { useState } from "react";
import type { Stop, StopInput } from "@/lib/types";
import { Modal } from "./modal";

interface StopFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: StopInput) => Promise<void>;
  /** Pass an existing stop to edit it; omit to create a new one. */
  initialStop?: Stop;
}

const EMPTY_INPUT: StopInput = { rawAddress: "", label: "", notes: "" };

export function StopFormModal({ isOpen, onClose, onSubmit, initialStop }: StopFormModalProps) {
  return (
    <Modal title={initialStop ? "Edit Stop" : "Add Stop"} isOpen={isOpen} onClose={onClose}>
      {/* Only mounted while open — see EventFormModal for why this avoids a setState-in-effect. */}
      {isOpen && <StopFormFields onClose={onClose} onSubmit={onSubmit} initialStop={initialStop} />}
    </Modal>
  );
}

function StopFormFields({ onClose, onSubmit, initialStop }: Omit<StopFormModalProps, "isOpen">) {
  const [form, setForm] = useState<StopInput>(() =>
    initialStop
      ? { rawAddress: initialStop.rawAddress, label: initialStop.label ?? "", notes: initialStop.notes ?? "" }
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
        <label className="mb-1 block text-sm font-medium text-gray-700">Address</label>
        <input
          required
          value={form.rawAddress}
          onChange={(e) => setForm((f) => ({ ...f, rawAddress: e.target.value }))}
          placeholder="123 Maple St, Maple Grove, MA"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-gray-400">
          Geocoding happens automatically once the backend is wired up (Phase 2).
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Label (optional)</label>
        <input
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          placeholder="e.g. Multi-family sale"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Notes (optional)</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
          placeholder="Furniture, kids' clothes, tools…"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
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
          {isSubmitting ? "Saving…" : initialStop ? "Save changes" : "Add stop"}
        </button>
      </div>
    </form>
  );
}
