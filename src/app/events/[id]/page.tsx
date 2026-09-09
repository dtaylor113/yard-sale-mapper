import { EventDetailClient } from "@/components/event-detail-client";

export default async function EventDetailPage(props: PageProps<"/events/[id]">) {
  const { id } = await props.params;
  return <EventDetailClient eventId={id} />;
}
