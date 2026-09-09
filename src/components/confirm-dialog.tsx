import { Modal } from "./modal";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
  danger = true,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} isOpen={isOpen} onClose={onCancel} widthClassName="max-w-sm">
      <p className="text-sm leading-relaxed text-ink-muted">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
