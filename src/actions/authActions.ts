"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { authRateLimiter } from "@/lib/ratelimit";
import { headers } from "next/headers";
import { createSafeAction } from "@/lib/actionHandler";

const SetTutorClaimsSchema = z.object({
  uidOrToken: z.string().min(1, "UID or token is required"),
});

/**
 * Sets tutor role and profile for a registered user.
 */
export const setTutorClaims = createSafeAction(
  SetTutorClaimsSchema,
  async ({ uidOrToken }) => {
    const supabase = createAdminClient();

    try {
      const headersList = await headers();
      const ip = headersList.get("x-forwarded-for") ?? "127.0.0.1";
      await authRateLimiter.limit(ip);
    } catch {
      // Continue silently if rate limiter fails
    }

    const { verifyUserAuth } = await import("@/lib/authHelpers");
    const auth = await verifyUserAuth(uidOrToken);
    const uid = auth.uid;

    const { error: profileErr } = await supabase.from("profiles").upsert({
      id: uid,
      role: "tutor",
      tutor_id: uid,
      updated_at: new Date().toISOString(),
    });

    if (profileErr) {
      throw new Error(profileErr.message);
    }

    const { error: tutorErr } = await supabase.from("tutors").upsert({
      id: uid,
      user_id: uid,
      full_name: auth.email || "Tutor",
      institution: "Independent",
      contact_phone: "",
    });

    if (tutorErr) {
      throw new Error(tutorErr.message);
    }

    return { success: true };
  },
  { requireAuth: false }
);

const GetUserProfileSchema = z.object({
  uid: z.string().min(1, "UID is required"),
});

/**
 * Checks if user profile exists in Supabase `profiles` table.
 */
export const getUserProfile = createSafeAction(
  GetUserProfileSchema,
  async ({ uid }) => {
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
  },
  { requireAuth: false }
);

const OnboardTutorUserSchema = z.object({
  data: z.object({
    email: z.string().nullable().optional(),
    displayName: z.string().min(1, "Display name is required"),
    phoneNumber: z.string().nullable().optional(),
    institution: z.string().optional(),
    role: z.enum(["tutor", "owner"]).optional().default("tutor"),
  }),
  uidOrToken: z.string().min(1, "UID or token is required"),
});

/**
 * Onboard a Google or Phone user as a Tutor via Supabase Admin Client.
 */
export const onboardTutorUser = createSafeAction(
  OnboardTutorUserSchema,
  async ({ data, uidOrToken }) => {
    const supabase = createAdminClient();

    const { verifyUserAuth } = await import("@/lib/authHelpers");
    const auth = await verifyUserAuth(uidOrToken);
    const uid = auth.uid;

    try {
      const headersList = await headers();
      const ip = headersList.get("x-forwarded-for") ?? "127.0.0.1";
      await authRateLimiter.limit(ip);
    } catch {
      // Continue silently if rate limiter fails
    }

    const { email, displayName, phoneNumber, institution, role } = data;

    // 1. Create or update profile
    const { error: profileErr } = await supabase.from("profiles").upsert({
      id: uid,
      email: email || "",
      display_name: displayName || "Tutor",
      phone_number: phoneNumber || null,
      role: role || "tutor",
      tutor_id: uid,
      updated_at: new Date().toISOString(),
    });

    if (profileErr) {
      throw new Error(`Profile creation failed: ${profileErr.message}`);
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
      throw new Error(`Tutor creation failed: ${tutorErr.message}`);
    }

    // 3. If role is owner, automatically create coaching center if not already created
    if (role === "owner") {
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

    // Sync user_metadata in Supabase Auth
    await supabase.auth.admin.updateUserById(uid, {
      user_metadata: {
        role: role || "tutor",
        tutorId: uid,
        full_name: displayName,
      },
    }).catch((metaErr) => {
      console.warn("User metadata update error in onboardTutorUser:", metaErr);
    });

    return { success: true, role: role || "tutor" };
  },
  { requireAuth: false }
);
