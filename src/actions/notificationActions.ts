"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import type { NotificationDoc, NotificationType } from "@/types";

// ----------------------------------------------------------------
// INTERNAL — called from other server actions (no auth check)
// ----------------------------------------------------------------

/**
 * Insert a notification for a given Supabase user (profiles.id).
 * This is a fire-and-forget helper — errors are swallowed to avoid
 * blocking the primary action that triggered this.
 */
export async function createNotification(
  userId: string,
  title: string,
  body: string | null,
  type: NotificationType,
  referenceId?: string,
  referenceType?: string
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("notifications").insert({
      user_id: userId,
      title,
      body: body || null,
      type,
      reference_id: referenceId || null,
      reference_type: referenceType || null,
      is_read: false,
    });
  } catch (err) {
    // Never block caller — log and continue
    console.error("[createNotification] failed:", err);
  }
}

// ----------------------------------------------------------------
// PUBLIC — called from client with idToken
// ----------------------------------------------------------------

export async function getNotifications(idToken: string): Promise<NotificationDoc[]> {
  const authState = await verifyUserAuth(idToken);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", authState.uid)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(`Failed to fetch notifications: ${error.message}`);

  return (data || []).map((n: any) => ({
    id: n.id,
    userId: n.user_id,
    title: n.title,
    body: n.body,
    type: n.type,
    referenceId: n.reference_id,
    referenceType: n.reference_type,
    isRead: n.is_read,
    createdAt: n.created_at,
  })) as NotificationDoc[];
}

export async function getUnreadCount(idToken: string): Promise<number> {
  const authState = await verifyUserAuth(idToken);
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", authState.uid)
    .eq("is_read", false);

  if (error) throw new Error(`Failed to fetch unread count: ${error.message}`);
  return count ?? 0;
}

export async function markAsRead(
  notificationId: string,
  idToken: string
): Promise<{ success: boolean }> {
  const authState = await verifyUserAuth(idToken);
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", authState.uid);

  if (error) throw new Error(`Failed to mark notification read: ${error.message}`);
  return { success: true };
}

export async function markAllAsRead(
  idToken: string
): Promise<{ success: boolean }> {
  const authState = await verifyUserAuth(idToken);
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", authState.uid)
    .eq("is_read", false);

  if (error) throw new Error(`Failed to mark all read: ${error.message}`);
  return { success: true };
}
