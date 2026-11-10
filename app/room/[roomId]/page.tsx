import MeetingRoom from "./MeetingRoom";

export default async function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  return <MeetingRoom roomId={roomId} />;
}