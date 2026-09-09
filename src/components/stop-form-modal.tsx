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
        <label className="field-label">Address</label>
        <input
          required
          value={form.rawAddress}
          onChange={(e) => setForm((f) => ({ ...f, rawAddress: e.target.value }))}
          placeholder="123 Maple St, Maple Grove, MA"
          className="field"
        />
        <p className="field-hint">Geocoding happens automatically once the backend is wired up (Phase 2).</p>
      </div>

      <div>
        <label className="field-label">Label (optional)</label>
        <input
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          placeholder="e.g. Multi-family sale"
          className="field"
        />
      </div>

      <div>
        <label className="field-label">Notes (optional)</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
          placeholder="Furniture, kids' clothes, tools…"
          className="field"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className="btn btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="btn btn-primary">
          {isSubmitting ? "Saving…" : initialStop ? "Save changes" : "Add stop"}
        </button>
      </div>
    </form>
  );
}
