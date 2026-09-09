import { createContext, useContext } from "react";

// STUB: In the real implementation (see ROADMAP.md "Admin access"), logging in
// becomes a call to `POST /api/admin/login`, which checks a hashed password
// from an env var and sets an httpOnly signed session cookie; the server
// checks that session on every mutating request. For this UI-only mockup
// phase there's no server, so `AdminProvider` just fakes a network delay and
// accepts a single hardcoded demo password.
export const DEMO_ADMIN_PASSWORD = "yardsale";

export interface AdminContextValue {
  isAdmin: boolean;
  /** Resolves true/false; never throws. Matches the shape of a future real API call. */
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

export const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return ctx;
}
