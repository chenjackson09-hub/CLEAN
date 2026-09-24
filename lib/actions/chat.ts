"use server";

import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type { ChatMessage } from "@/lib/chatFormat";
import { CHAT_PAGE_SIZE } from "@/lib/chat";

const MAX_MESSAGE_LENGTH = 2000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SendResult = { message: ChatMessage } | { error: string };

// Sends a text message as the signed-in user. The sender is always taken from
// the session (never from the client), and the insert runs on the user's own
// RLS-scoped client, so the database itself rejects anyone who isn't a
// participant of the conversation. `clientId` makes a retried/double-submitted
// send idempotent (unique per conversation).
export async function sendMessage(
  conversationId: string,
  body: string,
  clientId: string
): Promise<SendResult> {
  const trimmed = (body ?? "").trim();
  if (!trimmed) return { error: "Please enter a message." };
  if (trimmed.length > MAX_MESSAGE_LENGTH) return { error: "Message is too long." };
  if (!UUID_RE.test(conversationId) || !UUID_RE.test(clientId)) return { error: "Invalid request." };

  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };

  const supabase = await createClient();
  const columns = "id, sender_id, body, created_at, client_id";

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, body: trimmed, client_id: clientId })
    .select(columns)
    .single<ChatMessage>();

  if (error) {
    // Unique violation on (conversation_id, client_id): this exact send already
    // landed (retry after a dropped response) — return the stored row.
    if (error.code === "23505") {
      const { data: existing } = await supabase
        .from("messages")
        .select(columns)
        .eq("conversation_id", conversationId)
        .eq("client_id", clientId)
        .single<ChatMessage>();
      if (existing) return { message: existing };
    }
    return { error: "Couldn't send your message. Please try again." };
  }
  return { message: data };
}

// Older messages for the "Load earlier" button: everything strictly before
// the oldest message the client already has.
export async function loadOlderMessages(
  conversationId: string,
  before: string
): Promise<{ messages: ChatMessage[]; hasMore: boolean } | { error: string }> {
  if (!UUID_RE.test(conversationId)) return { error: "Invalid request." };
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at, client_id")
    .eq("conversation_id", conversationId)
    .lt("created_at", before)
    .order("created_at", { ascending: false })
    .limit(CHAT_PAGE_SIZE + 1);
  if (error) return { error: "Couldn't load earlier messages." };

  const rows = (data ?? []) as ChatMessage[];
  return { messages: rows.slice(0, CHAT_PAGE_SIZE).reverse(), hasMore: rows.length > CHAT_PAGE_SIZE };
}
