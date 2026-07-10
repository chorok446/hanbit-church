import EventEditClient from "./event-edit-client";

export default async function EventEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventEditClient id={id} />;
}
