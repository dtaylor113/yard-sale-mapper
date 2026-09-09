import { useCallback, useMemo, useState, type ReactNode } from "react";
import { AdminContext, DEMO_ADMIN_PASSWORD } from "./admin-context";

const FAKE_NETWORK_DELAY_MS = 500;

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
