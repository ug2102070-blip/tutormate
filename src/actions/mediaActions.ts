"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";

/**
 * Generates a signed/public URL for a Supabase Storage object.
 * Uses cookie-based auth — no token needed from the client.
 */
export async function getMediaSignedUrl(storagePath: string): Promise<string | null> {
  if (!storagePath) return null;

  await verifyUserAuth(); // Ensures caller is authenticated

  // If path is already a full URL
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    return storagePath;
  }

  const supabase = createAdminClient();
  
  // Try signed URL first (supports both private and public buckets, 1 hour validity)
  const { data: signedData, error } = await supabase.storage
    .from("attachments")
    .createSignedUrl(storagePath, 3600);

  if (!error && signedData?.signedUrl) {
    return signedData.signedUrl;
  }

  // Fallback to public URL
  const { data } = supabase.storage.from("attachments").getPublicUrl(storagePath);

  return data.publicUrl || null;
}
