"use client";

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
        <p className="text-sm text-gray-500">
          Enter the admin password to create, edit, or delete events and stops.
        </p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-xs text-gray-400">(Mockup hint: the demo password is &quot;yardsale&quot;.)</p>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || password.length === 0}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? "Checking…" : "Log in"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
