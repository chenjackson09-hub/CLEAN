import ChatThreadPage from "@/components/chat/ChatThreadPage";

export default async function CleanerChatPage({ params }: { params: Promise<{ hostId: string }> }) {
  const { hostId } = await params;
  return <ChatThreadPage role="cleaner" otherId={hostId} backHref="/cleaner/chat" />;
}
