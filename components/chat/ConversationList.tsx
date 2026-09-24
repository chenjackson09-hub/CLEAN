import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listConversations } from "@/lib/chat";
import ConversationListView from "./ConversationListView";

// Inbox shared by both roles' /chat routes: one row per host/cleaner pair.
export default async function ConversationList({
  role,
  basePath,
}: {
  role: "host" | "cleaner";
  basePath: string;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rows = await listConversations({
    supabase: await createClient(),
    admin: createAdminClient(),
    userId: user.id,
    role,
  });
  return <ConversationListView rows={rows} role={role} basePath={basePath} />;
}
