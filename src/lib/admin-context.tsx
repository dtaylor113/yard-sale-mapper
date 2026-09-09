"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

// STUB: In the real implementation (see ROADMAP.md "Admin access"), this
// becomes a call to `POST /api/admin/login`, which checks a hashed password
// from an env var and sets an httpOnly signed session cookie; the server
// checks that session on every mutating request. For this UI-only mockup
// phase there's no server, so we just fake a network delay and accept a
// single hardcoded demo password.
const DEMO_ADMIN_PASSWORD = "yardsale";
const FAKE_NETWORK_DELAY_MS = 500;

interface AdminContextValue {
  isAdmin: boolean;
  /** Resolves true/false; never throws. Matches the shape of a future real API call. */
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);

  const login = useCallback(async (password: string) => {
    await new Promise((resolve) => setTimeout(resolve, FAKE_NETWORK_DELAY_MS));
    const success = password === DEMO_ADMIN_PASSWORD;
    if (success) {
      setIsAdmin(true);
    }
    return success;
  }, []);

  const logout = useCallback(() => {
    setIsAdmin(false);
  }, []);

  const value = useMemo(() => ({ isAdmin, login, logout }), [isAdmin, login, logout]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return ctx;
}

export { DEMO_ADMIN_PASSWORD };
