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

  let uid = "";
  let user: any = null;

  try {
    const { verifyUserAuth } = await import("@/lib/authHelpers");
    const auth = await verifyUserAuth(uidOrToken);
    uid = auth.uid;
    user = { id: auth.uid, email: auth.email };
  } catch (err) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Upsert into profiles table
    const { error: profileErr } = await supabase.from("profiles").upsert({
      id: uid,
      role: "tutor",
      tutor_id: uid,
      updated_at: new Date().toISOString(),
    });

    if (profileErr) {
      console.warn("profiles upsert error:", profileErr);
      return { success: false, error: profileErr.message };
    }

    // Upsert into tutors table
    const { error: tutorErr } = await supabase.from("tutors").upsert({
      id: uid,
      user_id: uid,
      full_name: user?.user_metadata?.full_name || "Tutor",
      institution: "Independent",
      contact_phone: user?.phone || "",
    });

    if (tutorErr) {
      console.warn("tutors upsert error:", tutorErr);
      return { success: false, error: tutorErr.message };
    }
  } catch (err) {
    console.warn("Could not write to Supabase profiles/tutors:", err);
    return { success: false, error: String(err) };
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
    role?: "tutor" | "owner";
  },
  uidOrToken: string
) {
  const supabase = createAdminClient();
  let uid = "";
  let user: any = null;

  try {
    const { verifyUserAuth } = await import("@/lib/authHelpers");
    const auth = await verifyUserAuth(uidOrToken);
    uid = auth.uid;
    user = { id: auth.uid, email: auth.email };
  } catch (err) {
    return { success: false, error: "Unauthorized" };
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
    const { error: profileErr } = await supabase.from("profiles").upsert({
      id: uid,
      email: email || "",
      display_name: displayName || "Tutor",
      phone_number: phoneNumber || null,
      role: data.role || "tutor",
      tutor_id: uid,
      updated_at: new Date().toISOString(),
    });

    if (profileErr) {
      console.warn("profiles upsert error:", profileErr);
      return { success: false, error: profileErr.message, role: data.role || "tutor" };
    }

    // 2. Create or update tutor record
    const { error: tutorErr } = await supabase.from("tutors").upsert({
      id: uid,
      user_id: uid,
      full_name: displayName || "Tutor",
      institution: institution || "Independent",
      contact_phone: phoneNumber || "",
    });

    if (tutorErr) {
      console.warn("tutors upsert error:", tutorErr);
      return { success: false, error: tutorErr.message, role: data.role || "tutor" };
    }

    // 3. If role is owner, automatically create coaching center if not already created
    if (data.role === "owner") {
      try {
        const { data: existingCenter } = await supabase
          .from("coaching_centers")
          .select("id")
          .eq("owner_uid", uid)
          .maybeSingle();

        if (!existingCenter) {
          const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
          let joinCode = "CC-";
          for (let i = 0; i < 6; i++) {
            joinCode += chars.charAt(Math.floor(Math.random() * chars.length));
          }

          const centerName =
            institution && institution.trim() && institution.trim() !== "Independent"
              ? institution.trim()
              : `${displayName || "My"}'s Coaching Center`;

          const { data: newCenter } = await supabase
            .from("coaching_centers")
            .insert({
              owner_uid: uid,
              name: centerName,
              code: joinCode,
              contact_phone: phoneNumber || null,
            })
            .select("id")
            .single();

          if (newCenter) {
            await supabase
              .from("tutors")
              .update({ coaching_center_id: newCenter.id })
              .eq("id", uid);
          }
        }
      } catch (centerErr) {
        console.warn("Auto create coaching center error:", centerErr);
      }
    }
    // Sync user_metadata in Supabase Auth so client-side fetchUserClaims uses fast-path
    await supabase.auth.admin.updateUserById(uid, {
      user_metadata: {
        role: data.role || "tutor",
        tutorId: uid,
        full_name: displayName,
      },
    }).catch((metaErr) => {
      console.warn("User metadata update error in onboardTutorUser:", metaErr);
    });
  } catch (err) {
    console.warn("Could not complete onboardTutorUser via Supabase:", err);
    return { success: false, error: String(err), role: data.role || "tutor" };
  }

  return { success: true, role: data.role || "tutor" };
}
