import ChatThreadPage from "@/components/chat/ChatThreadPage";

export default function HostChatPage({ params }: { params: { cleanerId: string } }) {
  return <ChatThreadPage role="host" otherId={params.cleanerId} backHref="/chat" />;
}
