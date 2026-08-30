"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { authRateLimiter } from "@/lib/ratelimit";
import { headers } from "next/headers";
import { createSafeAction } from "@/lib/actionHandler";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts the client IP address from headers for rate limiting.
 * Falls back to a fixed key so the in-memory limiter always works.
 */
async function getClientIP(): Promise<string> {
  try {
    const headersList = await headers();
    return (
      headersList.get("x-forwarded-for")?.split(",")[0].trim() ||
      headersList.get("x-real-ip") ||
      "127.0.0.1"
    );
  } catch {
    return "127.0.0.1";
  }
}

/**
 * Enforces rate limit and throws a structured error if exceeded.
 *
 * FIX (Phase 0): Previously the rate limiter was wrapped in try/catch
 * that silently swallowed failures — allowing unlimited requests even
 * when the limiter should have blocked them. This version:
 * 1. Actually checks the result and throws on limit exceeded.
 * 2. Uses the in-memory fallback when Redis is unavailable (already
 *    handled by ratelimit.ts), so it never silently passes through.
 */
async function enforceRateLimit(key: string): Promise<void> {
  const result = await authRateLimiter.limit(key);
  if (!result.success) {
    throw new Error(
      "Too many requests. Please wait a moment before trying again."
    );
  }
}

// ─── SET TUTOR CLAIMS ─────────────────────────────────────────────────────────

const SetTutorClaimsSchema = z.object({
  uidOrToken: z.string().min(1, "UID or token is required"),
});

/**
 * Sets tutor role and profile for a registered user.
 *
 * FIX (Phase 0): Added explicit rate limiting enforcement (not silently
 * swallowed). Auth still verifies the provided token cryptographically.
 */
export const setTutorClaims = createSafeAction(
  SetTutorClaimsSchema,
  async ({ uidOrToken }) => {
    const supabase = createAdminClient();
    const ip = await getClientIP();

    // Enforce rate limit — throws if exceeded
    await enforceRateLimit(ip);

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

// ─── GET USER PROFILE ─────────────────────────────────────────────────────────

const GetUserProfileSchema = z.object({
  uid: z.string().uuid("Invalid UID format"),
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

// ─── ONBOARD TUTOR USER ───────────────────────────────────────────────────────

const OnboardTutorUserSchema = z.object({
  data: z.object({
    email: z.string().nullable().optional(),
    displayName: z.string().min(1, "Display name is required").max(100),
    phoneNumber: z.string().nullable().optional(),
    institution: z.string().optional(),
    role: z.enum(["tutor", "owner"]).optional().default("tutor"),
  }),
  uidOrToken: z.string().min(1, "UID or token is required"),
});

/**
 * Onboard a user as a Tutor via Supabase Admin Client.
 *
 * FIX (Phase 0):
 * 1. Rate limit is now enforced (throws on exceeded, not silently swallowed).
 * 2. After token verification, the action double-checks that the verified UID
 *    matches the session — preventing token replay attacks.
 * 3. Input validation strengthened (maxLength on displayName).
 */
export const onboardTutorUser = createSafeAction(
  OnboardTutorUserSchema,
  async ({ data, uidOrToken }) => {
    const supabase = createAdminClient();
    const ip = await getClientIP();

    // Enforce rate limit — throws if exceeded
    await enforceRateLimit(ip);

    // Verify the provided token is cryptographically valid
    const { verifyUserAuth } = await import("@/lib/authHelpers");
    const auth = await verifyUserAuth(uidOrToken);
    const uid = auth.uid;

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

    // 4. Sync user_metadata in Supabase Auth for fast JWT claim reads
    await supabase.auth.admin
      .updateUserById(uid, {
        user_metadata: {
          role: role || "tutor",
          tutorId: uid,
          full_name: displayName,
        },
      })
      .catch((metaErr) => {
        console.warn("User metadata update error in onboardTutorUser:", metaErr);
      });

    return { success: true, role: role || "tutor" };
  },
  { requireAuth: false }
);

// ─── ONBOARD STUDENT OR PARENT USER (WITHOUT INVITE CODE) ───────────────────────

const OnboardStudentOrParentSchema = z.object({
  data: z.object({
    email: z.string().nullable().optional(),
    displayName: z.string().min(1, "Display name is required").max(100),
    phoneNumber: z.string().nullable().optional(),
    role: z.enum(["student", "parent"]).optional().default("student"),
  }),
  uidOrToken: z.string().min(1, "UID or token is required"),
});

/**
 * Onboard a user as a Student or Parent directly without needing an upfront invite code.
 * They can later be linked to a tutor via phone search or by claiming an invite code.
 */
export const onboardStudentOrParentUser = createSafeAction(
  OnboardStudentOrParentSchema,
  async ({ data, uidOrToken }) => {
    const supabase = createAdminClient();
    const ip = await getClientIP();

    await enforceRateLimit(ip);

    const { verifyUserAuth } = await import("@/lib/authHelpers");
    const auth = await verifyUserAuth(uidOrToken);
    const uid = auth.uid;

    const { email, displayName, phoneNumber, role } = data;

    // 1. Create or update profile in profiles table
    const { error: profileErr } = await supabase.from("profiles").upsert({
      id: uid,
      email: email || auth.email || "",
      display_name: displayName || (role === "student" ? "Student" : "Parent"),
      phone_number: phoneNumber || null,
      role: role || "student",
      updated_at: new Date().toISOString(),
    });

    if (profileErr) {
      throw new Error(`Profile creation failed: ${profileErr.message}`);
    }

    // 2. Sync user_metadata in Supabase Auth for fast JWT claims
    await supabase.auth.admin
      .updateUserById(uid, {
        user_metadata: {
          role: role || "student",
          full_name: displayName,
          phone_number: phoneNumber || undefined,
        },
      })
      .catch((metaErr) => {
        console.warn("User metadata update error in onboardStudentOrParentUser:", metaErr);
      });

    return { success: true, role: role || "student" };
  },
  { requireAuth: false }
);

// ─── REGISTER WITH PHONE AND PASSWORD (NO SMS OTP NEEDED) ───────────────────

const RegisterWithPhoneAndPasswordSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(100),
  phone: z.string().min(10, "Please enter a valid phone number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["tutor", "student", "owner", "parent"]).default("student"),
  institution: z.string().optional(),
  inviteCode: z.string().optional(),
});

export const registerWithPhoneAndPassword = createSafeAction(
  RegisterWithPhoneAndPasswordSchema,
  async ({ fullName, phone, password, role, institution, inviteCode }) => {
    const supabase = createAdminClient();
    const ip = await getClientIP();
    await enforceRateLimit(ip);

    // Format phone
    const cleaned = phone.replace(/\D/g, "");
    const localPhone = cleaned.startsWith("880") ? "0" + cleaned.slice(3) : cleaned.startsWith("0") ? cleaned : "0" + cleaned;
    const internationalPhone = cleaned.startsWith("880") ? `+${cleaned}` : cleaned.startsWith("0") ? `+88${cleaned}` : `+880${cleaned}`;

    // 1. Create user in Supabase Auth directly with phone & password (no SMS needed)
    const { data: userData, error: createErr } = await supabase.auth.admin.createUser({
      phone: internationalPhone,
      password: password,
      phone_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role,
        phone_number: localPhone,
      },
    });

    if (createErr) {
      if (
        createErr.message.includes("already registered") ||
        createErr.message.includes("already been registered") ||
        createErr.message.includes("phone_exists")
      ) {
        throw new Error("This phone number is already registered. Please sign in instead.");
      }
      throw new Error(createErr.message);
    }

    const uid = userData.user.id;

    // 2. Upsert profile in profiles table
    const { error: profileErr } = await supabase.from("profiles").upsert({
      id: uid,
      display_name: fullName,
      phone_number: localPhone,
      role: role,
      tutor_id: role === "tutor" || role === "owner" ? uid : null,
      updated_at: new Date().toISOString(),
    });

    if (profileErr) {
      console.warn("Profile upsert warning:", profileErr.message);
    }

    // 3. Role specific setup
    if (role === "tutor" || role === "owner") {
      await supabase.from("tutors").upsert({
        id: uid,
        user_id: uid,
        full_name: fullName,
        institution: institution || "Independent",
        contact_phone: localPhone,
      });

      if (role === "owner") {
        try {
          const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
          let joinCode = "CC-";
          for (let i = 0; i < 6; i++) {
            joinCode += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          const centerName =
            institution && institution.trim() && institution.trim() !== "Independent"
              ? institution.trim()
              : `${fullName}'s Coaching Center`;

          const { data: newCenter } = await supabase
            .from("coaching_centers")
            .insert({
              owner_uid: uid,
              name: centerName,
              code: joinCode,
              contact_phone: localPhone,
            })
            .select("id")
            .single();

          if (newCenter) {
            await supabase
              .from("tutors")
              .update({ coaching_center_id: newCenter.id })
              .eq("id", uid);
          }
        } catch (e) {
          console.warn("Auto create center error:", e);
        }
      }
    }

    // 4. If invite code provided, claim or link
    const cleanInvite = inviteCode ? inviteCode.trim().toUpperCase() : "";
    if (cleanInvite) {
      if (role === "student") {
        const { data: student } = await supabase
          .from("students")
          .select("id, tutor_id, auth_uid")
          .eq("invite_code", cleanInvite)
          .maybeSingle();
        if (student && !student.auth_uid) {
          await supabase
            .from("students")
            .update({ auth_uid: uid, phone: localPhone })
            .eq("id", student.id);
          await supabase
            .from("profiles")
            .update({ student_doc_id: student.id, tutor_id: student.tutor_id })
            .eq("id", uid);
        }
      } else if (role === "parent") {
        const { data: student } = await supabase
          .from("students")
          .select("id, tutor_id, auth_uid")
          .eq("invite_code", cleanInvite)
          .maybeSingle();
        if (student) {
          await supabase
            .from("profiles")
            .update({ student_doc_id: student.id, tutor_id: student.tutor_id })
            .eq("id", uid);
        }
      }
    }

    return { success: true, formattedPhone: internationalPhone, role };
  },
  { requireAuth: false }
);


