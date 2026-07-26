"use server";

import { createAdminClient } from "@/lib/supabase/server";

/**
 * Updates user presence status in Supabase `user_presence` table.
 */
export async function updateUserPresence(uid: string, isOnline: boolean) {
  if (!uid) return { success: false };

  try {
    const supabase = createAdminClient();

    await supabase.from("user_presence").upsert({
      uid,
      is_online: isOnline,
      last_seen: new Date().toISOString(),
    });

    return { success: true };
  } catch {
    return { success: false };
  }
}
