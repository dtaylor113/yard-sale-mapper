"use client";

import type { ReactNode } from "react";
import { AdminProvider } from "@/lib/admin-context";
import { DataProvider } from "@/lib/data-context";
import { Header } from "./header";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      <DataProvider>
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      </DataProvider>
    </AdminProvider>
  );
}
