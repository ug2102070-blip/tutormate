"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { authRateLimiter } from "@/lib/ratelimit";
import { headers } from "next/headers";

/**
 * Sets tutor role and profile for a registered user.
 */
export async function setTutorClaims(uidOrToken: string) {
  const supabase = createAdminClient();

  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? "127.0.0.1";
    await authRateLimiter.limit(ip);
  } catch {
    // Continue silently if rate limiter instance fails
  }

  let uid = uidOrToken;
  let user: any = null;

  if (uidOrToken && typeof uidOrToken === "string" && uidOrToken.includes(".")) {
    try {
      const authRes = await supabase.auth.getUser(uidOrToken);
      user = authRes?.data?.user || null;
      if (user) {
        uid = user.id;
      }
    } catch {
      // Ignore
    }
  }

  try {
    // Upsert into profiles table
    await supabase.from("profiles").upsert({
      id: uid,
      role: "tutor",
      tutor_id: uid,
      updated_at: new Date().toISOString(),
    });

    // Upsert into tutors table
    await supabase.from("tutors").upsert({
      id: uid,
      user_id: uid,
      full_name: user?.user_metadata?.full_name || "Tutor",
      institution: "Independent",
      contact_phone: user?.phone || "",
    });
  } catch (err) {
    console.warn("Could not write to Supabase profiles/tutors:", err);
  }

  return { success: true };
}

/**
 * Checks if user profile exists in Supabase `profiles` table.
 */
export async function getUserProfile(uid: string) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();

    if (error || !data) {
      return { exists: false, data: null };
    }
    return { exists: true, data };
  } catch (err) {
    console.warn("Could not fetch user profile via Supabase:", err);
    return { exists: false, data: null };
  }
}

/**
 * Onboard a Google or Phone user as a Tutor via Supabase Admin Client.
 */
export async function onboardTutorUser(
  data: {
    email: string | null;
    displayName: string;
    phoneNumber?: string | null;
    institution?: string;
  },
  uidOrToken: string
) {
  const supabase = createAdminClient();
  let uid = uidOrToken;
  let user: any = null;

  if (uidOrToken && typeof uidOrToken === "string" && uidOrToken.includes(".")) {
    try {
      const authRes = await supabase.auth.getUser(uidOrToken);
      user = authRes?.data?.user || null;
      if (user) {
        uid = user.id;
      }
    } catch {
      // Ignore
    }
  }

  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? "127.0.0.1";
    await authRateLimiter.limit(ip);
  } catch {
    // Continue silently if rate limiter fails
  }

  const { email, displayName, phoneNumber, institution } = data;

  try {
    // 1. Create or update profile
    await supabase.from("profiles").upsert({
      id: uid,
      email: email || "",
      display_name: displayName || "Tutor",
      phone_number: phoneNumber || null,
      role: "tutor",
      tutor_id: uid,
      updated_at: new Date().toISOString(),
    });

    // 2. Create or update tutor record
    await supabase.from("tutors").upsert({
      id: uid,
      user_id: uid,
      full_name: displayName || "Tutor",
      institution: institution || "Independent",
      contact_phone: phoneNumber || "",
    });
  } catch (err) {
    console.warn("Could not complete onboardTutorUser via Supabase:", err);
  }

  return { success: true, role: "tutor" };
}
