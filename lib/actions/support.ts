"use server";

import { createClient, getCurrentUser } from "@/lib/supabase/server";

const MAX_MESSAGE_LENGTH = 2000;

type SupportResult = { success: true } | { error: string };

// Files a support message from the floating help widget (cleaner + customer
// pages). The row is scoped to the signed-in user — we never trust a
// client-passed id — and read back only by admins via the service-role client.
export async function sendSupportMessage(message: string): Promise<SupportResult> {
  const trimmed = (message ?? "").trim();
  if (!trimmed) return { error: "Please enter a message." };
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { error: "Message is too long." };
  }

  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in to contact us." };

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string | null }>();

  const { error } = await supabase.from("support_messages").insert({
    user_id: user.id,
    user_role: profile?.role ?? "unknown",
    message: trimmed,
  });

  if (error) return { error: "Could not send your message. Please try again." };

  return { success: true };
}
