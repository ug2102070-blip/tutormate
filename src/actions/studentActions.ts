"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { inviteRateLimiter } from "@/lib/ratelimit";
import { headers } from "next/headers";
import { createSafeAction } from "@/lib/actionHandler";

const ValidateInviteSchema = z.object({
  inviteCode: z.string().min(4, "Please enter a valid invite code (at least 4 characters).").transform(val => val.toUpperCase().trim())
});

/**
 * Validates a student invite code without claiming it.
 */
export const validateInviteCode = createSafeAction(
  ValidateInviteSchema,
  async ({ inviteCode }) => {
    const supabase = createAdminClient();

    const { data: student } = await supabase
      .from("students")
      .select("id, auth_uid")
      .eq("invite_code", inviteCode)
      .maybeSingle();

    if (!student) {
      throw new Error("Invalid invite code. Please check the code provided by your tutor.");
    }

    if (student.auth_uid) {
      throw new Error("This invite code has already been claimed by another student.");
    }

    return { valid: true };
  },
  { requireAuth: false }
);

const ClaimInviteSchema = z.object({
  inviteCode: z.string().min(4, "Invalid invite code format.").transform(val => val.toUpperCase().trim()),
  uidOrToken: z.string(),
});

/**
 * Claims a student invite code, linking the student's Supabase Auth account to their student record.
 */
export const claimStudentInvite = createSafeAction(
  ClaimInviteSchema,
  async ({ inviteCode, uidOrToken }, authContext) => {
    const supabase = createAdminClient();
    // authContext.uid has the verified auth uid
    const studentUid = authContext!.uid;
    const userEmail = authContext!.email;

    try {
      const headersList = await headers();
      const ip = headersList.get("x-forwarded-for") ?? "127.0.0.1";
      const { success: rateLimitOk } = await inviteRateLimiter.limit(ip);
  
      if (!rateLimitOk) {
        throw new Error("Too many attempts. Please wait 1 minute before trying again.");
      }
    } catch (rlErr) {
      if (rlErr instanceof Error && rlErr.message.includes("Too many attempts")) {
        throw rlErr;
      }
    }

    // 1. Fetch student by invite code
    const { data: student, error: fetchErr } = await supabase
      .from("students")
      .select("*")
      .eq("invite_code", inviteCode)
      .maybeSingle();

    if (fetchErr || !student) {
      throw new Error("Invalid invite code.");
    }

    if (student.auth_uid && student.auth_uid !== studentUid) {
      throw new Error("This invite code has already been claimed.");
    }

    // 2. Extract auth user details to construct profile
    let displayName = student.full_name || "Student";
    let phoneNumber = student.phone || null;

    if (!userEmail) {
      try {
        const { data: adminUser } = await supabase.auth.admin.getUserById(studentUid);
        if (adminUser?.user) {
          if (adminUser.user.user_metadata?.full_name) {
            displayName = adminUser.user.user_metadata.full_name;
          }
          if (adminUser.user.phone) {
            phoneNumber = adminUser.user.phone;
          }
        }
      } catch {
        // ignore
      }
    }

    // 3. Upsert profiles record FIRST
    const { error: profileErr } = await supabase.from("profiles").upsert({
      id: studentUid,
      email: userEmail,
      display_name: displayName,
      phone_number: phoneNumber,
      role: "student",
      tutor_id: student.tutor_id,
      student_doc_id: student.id,
      updated_at: new Date().toISOString(),
    });

    if (profileErr) {
      throw new Error(`Failed to create student profile: ${profileErr.message}`);
    }

    // 4. Link student auth_uid SECOND
    const { error: updateErr } = await supabase
      .from("students")
      .update({ auth_uid: studentUid })
      .eq("id", student.id);

    // 5. Sync user_metadata in Supabase Auth
    await supabase.auth.admin.updateUserById(studentUid, {
      user_metadata: {
        role: "student",
        tutorId: student.tutor_id,
        studentDocId: student.id,
        full_name: displayName,
      },
    }).catch((metaErr) => {
      console.warn("User metadata update error in claimStudentInvite:", metaErr);
    });

    return { tutorId: student.tutor_id };
  },
  { requireAuth: true }
);
