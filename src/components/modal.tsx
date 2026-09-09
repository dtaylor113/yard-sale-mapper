import { type ReactNode } from "react";

interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  widthClassName?: string;
}

export function Modal({ title, isOpen, onClose, children, widthClassName = "max-w-lg" }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/25 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`w-full ${widthClassName} max-h-[90vh] overflow-y-auto rounded-2xl bg-surface shadow-overlay`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <h2 className="text-[17px] font-semibold tracking-tight text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-subtle transition-colors duration-150 hover:bg-canvas hover:text-ink"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
