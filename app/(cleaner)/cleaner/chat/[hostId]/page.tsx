import ChatThreadPage from "@/components/chat/ChatThreadPage";

export default function CleanerChatPage({ params }: { params: { hostId: string } }) {
  return <ChatThreadPage role="cleaner" otherId={params.hostId} backHref="/cleaner/chat" />;
}
