import { Route, Routes } from "react-router-dom";
import { AdminProvider } from "@/lib/admin-provider";
import { DataProvider } from "@/lib/data-provider";
import { Header } from "@/components/header";
import { HomePage } from "@/pages/home-page";
import { EventDetailPage } from "@/pages/event-detail-page";
import { NotFoundPage } from "@/pages/not-found-page";

export function App() {
  return (
    <AdminProvider>
      <DataProvider>
        <div className="flex min-h-full flex-col bg-gray-50 text-gray-900">
          <Header />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/events/:eventId" element={<EventDetailPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
      </DataProvider>
    </AdminProvider>
  );
}
