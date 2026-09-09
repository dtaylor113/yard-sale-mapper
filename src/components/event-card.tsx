import { Link } from "react-router-dom";
import type { YardSaleEvent } from "@/lib/types";

interface EventCardProps {
  event: YardSaleEvent;
  stopCount: number;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const STATUS_CHIPS: Record<YardSaleEvent["status"], string> = {
  published: "chip chip-success",
  draft: "chip chip-neutral",
  archived: "chip chip-caution",
};

export function EventCard({ event, stopCount, isAdmin, onEdit, onDelete }: EventCardProps) {
  return (
    <div className="card flex items-start justify-between gap-4 p-5 transition-shadow duration-200 hover:shadow-lg">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to={`/events/${event.id}`}
            className="text-lg font-semibold tracking-tight text-ink transition-colors duration-150 hover:text-accent"
          >
            {event.name}
          </Link>
          <span className={STATUS_CHIPS[event.status]}>{event.status}</span>
        </div>
        <p className="mt-1.5 text-sm text-ink-muted">
          {new Date(event.eventDate).toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}{" "}
          · {stopCount} stop{stopCount === 1 ? "" : "s"}
        </p>
        <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-ink-muted">{event.description}</p>
        <Link to={`/events/${event.id}`} className="btn-text mt-4 inline-block text-sm">
          View event & plan route →
        </Link>
      </div>

      {isAdmin && (
        <div className="flex shrink-0 flex-col gap-2">
          <button type="button" onClick={onEdit} className="btn btn-secondary btn-sm">
            Edit
          </button>
          <button type="button" onClick={onDelete} className="btn btn-danger-outline btn-sm">
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
