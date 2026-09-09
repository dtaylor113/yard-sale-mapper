import { useState } from "react";
import { useAdmin } from "@/lib/admin-context";
import { Modal } from "./modal";

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminLoginModal({ isOpen, onClose }: AdminLoginModalProps) {
  const { login } = useAdmin();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const success = await login(password);
    setIsSubmitting(false);
    if (success) {
      setPassword("");
      onClose();
    } else {
      setError("Incorrect password.");
    }
  }

  return (
    <Modal title="Admin Login" isOpen={isOpen} onClose={onClose} widthClassName="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-sm leading-relaxed text-ink-muted">
          Enter the admin password to create, edit, or delete events and stops.
        </p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          className="field"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <p className="field-hint">(Mockup hint: the demo password is &quot;yardsale&quot;.)</p>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || password.length === 0}
            className="btn btn-primary"
          >
            {isSubmitting ? "Checking…" : "Log in"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
