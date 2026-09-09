import { Link } from "react-router-dom";
import type { YardSaleEvent } from "@/lib/types";

interface EventCardProps {
  event: YardSaleEvent;
  stopCount: number;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const STATUS_STYLES: Record<YardSaleEvent["status"], string> = {
  published: "bg-green-100 text-green-800",
  draft: "bg-gray-100 text-gray-600",
  archived: "bg-yellow-100 text-yellow-800",
};

export function EventCard({ event, stopCount, isAdmin, onEdit, onDelete }: EventCardProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/events/${event.id}`} className="text-lg font-semibold text-gray-900 hover:text-blue-700">
            {event.name}
          </Link>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[event.status]}`}>
            {event.status}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {new Date(event.eventDate).toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}{" "}
          · {stopCount} stop{stopCount === 1 ? "" : "s"}
        </p>
        <p className="mt-2 line-clamp-2 text-sm text-gray-600">{event.description}</p>
        <Link
          to={`/events/${event.id}`}
          className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          View event & plan route →
        </Link>
      </div>

      {isAdmin && (
        <div className="flex shrink-0 flex-col gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
