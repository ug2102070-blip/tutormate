"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";

/**
 * Generates a public or signed URL for a Supabase Storage object.
 */
export async function getMediaSignedUrl(
  storagePath: string,
  idToken: string
): Promise<string | null> {
  if (!storagePath || !idToken) return null;

  let authState;
  try {
    authState = await verifyUserAuth(idToken);
  } catch {
    throw new Error("Invalid or expired authentication token");
  }

  const supabase = createAdminClient();

  // If path is full URL already
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    return storagePath;
  }

  const { data } = supabase.storage
    .from("attachments")
    .getPublicUrl(storagePath);

  return data.publicUrl || null;
}
