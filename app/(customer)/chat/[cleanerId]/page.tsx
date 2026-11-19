import ChatThreadPage from "@/components/chat/ChatThreadPage";

export default async function HostChatPage({ params }: { params: Promise<{ cleanerId: string }> }) {
  const { cleanerId } = await params;
  return <ChatThreadPage role="host" otherId={cleanerId} backHref="/chat" />;
}
