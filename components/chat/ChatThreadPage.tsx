import { notFound, redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadChatThread } from "@/lib/chat";
import { shortName } from "@/lib/chatFormat";
import ChatView from "./ChatView";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Shared server page body for both roles' chat routes. The other party comes
// from the URL, but authorization never depends on it: the conversation is
// looked up as the (viewer, other) pair on the viewer's own RLS-scoped
// session, so guessing someone else's id just 404s.
export default async function ChatThreadPage({
  role,
  otherId,
  backHref,
}: {
  role: "host" | "cleaner";
  otherId: string;
  backHref: string;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!UUID_RE.test(otherId)) notFound();

  const supabase = await createClient();
  const thread = await loadChatThread({
    supabase,
    admin: createAdminClient(),
    userId: user.id,
    role,
    otherId,
  });
  if (!thread) notFound();

  return (
    <ChatView
      conversationId={thread.conversationId}
      currentUserId={user.id}
      currentUserRole={role}
      other={{
        id: thread.other.id,
        name: thread.other.name,
        // Hosts see cleaners as "First L."; cleaners already see hosts' full names.
        displayName: role === "host" ? shortName(thread.other.name) : thread.other.name,
        avatarUrl: thread.other.avatarUrl,
      }}
      initialMessages={thread.messages}
      initialHasMore={thread.hasMore}
      cards={thread.cards}
      backHref={backHref}
    />
  );
}
