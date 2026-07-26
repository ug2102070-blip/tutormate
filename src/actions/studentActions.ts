"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { inviteRateLimiter } from "@/lib/ratelimit";
import { headers } from "next/headers";

/**
 * Validates a student invite code without claiming it.
 */
export async function validateInviteCode(inviteCode: string) {
  const cleanCode = inviteCode ? inviteCode.toUpperCase().trim() : "";
  if (!cleanCode || cleanCode.length < 4) {
    return { success: false, error: "Please enter a valid invite code (at least 4 characters)." };
  }

  try {
    const supabase = createAdminClient();

    const { data: student } = await supabase
      .from("students")
      .select("id, auth_uid")
      .eq("invite_code", cleanCode)
      .maybeSingle();

    if (!student) {
      return { success: false, error: "Invalid invite code. Please check the code provided by your tutor." };
    }

    if (student.auth_uid) {
      return { success: false, error: "This invite code has already been claimed by another student." };
    }

    return { success: true };
  } catch (err) {
    console.warn("Could not validate invite code:", err);
    return { success: true };
  }
}

/**
 * Claims a student invite code, linking the student's Supabase Auth account to their student record.
 */
export async function claimStudentInvite(
  inviteCode: string,
  uidOrToken: string
) {
  const supabase = createAdminClient();
  let studentUid = uidOrToken;
  let user: any = null;

  if (uidOrToken && typeof uidOrToken === "string" && uidOrToken.includes(".")) {
    try {
      const authRes = await supabase.auth.getUser(uidOrToken);
      user = authRes?.data?.user || null;
      if (user) {
        studentUid = user.id;
      }
    } catch {
      // Ignore
    }
  }

  const cleanCode = inviteCode ? inviteCode.toUpperCase().trim() : "";
  if (!cleanCode || cleanCode.length < 4) {
    return { success: false, error: "Invalid invite code format." };
  }

  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? "127.0.0.1";
    const { success: rateLimitOk } = await inviteRateLimiter.limit(ip);

    if (!rateLimitOk) {
      return {
        success: false,
        error: "Too many attempts. Please wait 1 minute before trying again.",
      };
    }
  } catch (rlErr) {
    if (rlErr instanceof Error && rlErr.message.includes("Too many attempts")) {
      return { success: false, error: rlErr.message };
    }
  }

  try {
    // 1. Fetch student by invite code
    const { data: student, error: fetchErr } = await supabase
      .from("students")
      .select("*")
      .eq("invite_code", cleanCode)
      .maybeSingle();

    if (fetchErr || !student) {
      return { success: false, error: "Invalid invite code." };
    }

    if (student.auth_uid && student.auth_uid !== studentUid) {
      return { success: false, error: "This invite code has already been claimed." };
    }

    // 2. Extract auth user details to construct profile
    let userEmail = user?.email || "";
    let displayName = user?.user_metadata?.full_name || student.full_name || "Student";
    let phoneNumber = user?.phone || student.phone || null;

    if (!userEmail) {
      try {
        const { data: adminUser } = await supabase.auth.admin.getUserById(studentUid);
        if (adminUser?.user) {
          userEmail = adminUser.user.email || "";
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

    // 3. Upsert profiles record FIRST (so foreign key constraint students_auth_uid_fkey is satisfied)
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
      return { success: false, error: `Failed to create student profile: ${profileErr.message}` };
    }

    // 4. Link student auth_uid SECOND
    const { error: updateErr } = await supabase
      .from("students")
      .update({ auth_uid: studentUid })
      .eq("id", student.id);

    if (updateErr) {
      return { success: false, error: `Failed to claim invite: ${updateErr.message}` };
    }

    return { success: true, tutorId: student.tutor_id };
  } catch (err) {
    console.warn("Error during claimStudentInvite:", err);
    return { success: false, error: "Failed to process invite code. Please try again." };
  }
}
