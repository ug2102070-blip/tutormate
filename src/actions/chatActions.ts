"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import type { ConversationDoc, ChatMessageDoc } from "@/types";

export interface ConversationSummary extends ConversationDoc {
  participantNames?: string[];
  unreadCount?: number;
}

/**
 * Fetches all conversations accessible to the authenticated user.
 */
export async function getConversations(): Promise<{ success: boolean; conversations?: ConversationSummary[]; error?: string }> {
  try {
    const auth = await verifyUserAuth();
    const supabase = createAdminClient();

    // Query conversations where participant_uids contains user's UID or tutor_id matches
    const { data: convs, error: fetchErr } = await supabase
      .from("conversations")
      .select("*")
      .or(`participant_uids.cs.{${auth.uid}},tutor_id.eq.${auth.tutorId || auth.uid}`)
      .order("created_at", { ascending: false });

    if (fetchErr) {
      console.error("[getConversations] Fetch error:", fetchErr);
      return { success: false, error: fetchErr.message };
    }

    if (!convs || convs.length === 0) {
      return { success: true, conversations: [] };
    }

    // Attach latest message snippet for each conversation
    const summaries: ConversationSummary[] = await Promise.all(
      convs.map(async (c) => {
        const { data: lastMsg } = await supabase
          .from("chat_messages")
          .select("text, created_at")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          id: c.id,
          tutorId: c.tutor_id,
          participantUids: c.participant_uids || [],
          type: c.type,
          batchId: c.batch_id || null,
          title: c.title || null,
          createdAt: c.created_at,
          lastMessage: lastMsg?.text || "No messages yet",
          lastMessageAt: lastMsg?.created_at || c.created_at,
        };
      })
    );

    return { success: true, conversations: summaries };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch conversations." };
  }
}

/**
 * Creates a new direct chat or batch announcement conversation.
 */
export async function createConversation(
  participantUids: string[],
  type: "direct" | "announcement",
  batchId?: string,
  title?: string
): Promise<{ success: boolean; conversationId?: string; error?: string }> {
  try {
    const auth = await verifyUserAuth();
    const tutorId = auth.tutorId || auth.uid;

    const allParticipants = Array.from(new Set([auth.uid, ...participantUids]));
    const supabase = createAdminClient();

    const { data: conv, error: insertErr } = await supabase
      .from("conversations")
      .insert({
        tutor_id: tutorId,
        participant_uids: allParticipants,
        type,
        batch_id: batchId || null,
        title: title || (type === "announcement" ? "Batch Announcement" : "Direct Message"),
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr || !conv) {
      return { success: false, error: insertErr?.message || "Failed to create conversation." };
    }

    revalidatePath("/tutor/chat");
    revalidatePath("/student/chat");

    return { success: true, conversationId: conv.id };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create conversation." };
  }
}

/**
 * Fetches all chat messages within a conversation thread.
 */
export async function getChatMessages(
  conversationId: string
): Promise<{ success: boolean; messages?: ChatMessageDoc[]; error?: string }> {
  try {
    const auth = await verifyUserAuth();
    const supabase = createAdminClient();

    const { data: rawMsgs, error: fetchErr } = await supabase
      .from("chat_messages")
      .select("*, profiles(display_name, email)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (fetchErr) {
      return { success: false, error: fetchErr.message };
    }

    const messages: ChatMessageDoc[] = (rawMsgs || []).map((m: any) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderUid: m.sender_uid,
      senderRole: m.sender_role,
      text: m.text,
      attachmentPath: m.attachment_path || null,
      createdAt: m.created_at,
      senderName: m.profiles?.display_name || m.profiles?.email?.split("@")[0] || "User",
    }));

    return { success: true, messages };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch messages." };
  }
}

/**
 * Sends a message in a conversation thread and notifies participants.
 */
export async function sendChatMessage(
  conversationId: string,
  text: string,
  attachmentPath?: string
): Promise<{ success: boolean; message?: ChatMessageDoc; error?: string }> {
  try {
    const auth = await verifyUserAuth();
    const cleanText = text ? text.trim() : "";

    if (!cleanText && !attachmentPath) {
      return { success: false, error: "Cannot send empty message." };
    }

    const supabase = createAdminClient();

    const { data: insertedMsg, error: insertErr } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: conversationId,
        sender_uid: auth.uid,
        sender_role: auth.role || "user",
        text: cleanText,
        attachment_path: attachmentPath || null,
        created_at: new Date().toISOString(),
      })
      .select("*, profiles(display_name, email)")
      .single();

    if (insertErr || !insertedMsg) {
      return { success: false, error: insertErr?.message || "Failed to send message." };
    }

    const newMsgDoc: ChatMessageDoc = {
      id: insertedMsg.id,
      conversationId: insertedMsg.conversation_id,
      senderUid: insertedMsg.sender_uid,
      senderRole: insertedMsg.sender_role,
      text: insertedMsg.text,
      attachmentPath: insertedMsg.attachment_path || null,
      createdAt: insertedMsg.created_at,
      senderName: insertedMsg.profiles?.display_name || insertedMsg.profiles?.email?.split("@")[0] || "You",
    };

    revalidatePath("/tutor/chat");
    revalidatePath("/student/chat");

    return { success: true, message: newMsgDoc };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to send message." };
  }
}
