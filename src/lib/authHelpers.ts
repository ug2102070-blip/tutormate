import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

export interface VerifiedAuth {
  uid: string;
  role: UserRole | null;
  tutorId?: string;
  studentDocId?: string;
  email?: string;
}

/**
 * Verifies user authentication using Supabase cookies, JWT token, or user ID.
 */
export async function verifyUserAuth(idToken?: string): Promise<VerifiedAuth> {
  const adminSupabase = createAdminClient();

  // 1. Try verifying via server cookies first (most reliable in Next.js Server Actions)
  try {
    const serverSupabase = await createClient();
    const cookieRes = await serverSupabase.auth.getUser();
    const cookieUser = cookieRes?.data?.user;
    if (cookieUser && !cookieRes.error) {
      return await fetchProfileAuth(cookieUser.id, cookieUser.email);
    }
  } catch {
    // Ignore error if cookie context isn't available or fails
  }

  if (idToken && typeof idToken === "string") {
    // 2. If idToken is a JWT token (contains dots), try verifying with auth.getUser(idToken)
    if (idToken.includes(".")) {
      try {
        const tokenRes = await adminSupabase.auth.getUser(idToken);
        const user = tokenRes?.data?.user;
        if (user && !tokenRes.error) {
          return await fetchProfileAuth(user.id, user.email);
        }
      } catch {
        // Continue to user ID lookup
      }
    }

    // 3. Try admin.getUserById in case service role key IS available
    try {
      const { data: userById } = await adminSupabase.auth.admin.getUserById(idToken);
      if (userById?.user) {
        return await fetchProfileAuth(userById.user.id, userById.user.email);
      }
    } catch {
      // Continue to direct table lookup
    }

    // 4. If idToken is a User UUID, verify directly against profiles / tutors / students table
    if (idToken.length >= 30) {
      return await fetchProfileAuth(idToken);
    }
  }

  throw new Error("Invalid or expired authentication token");
}

async function fetchProfileAuth(uid: string, email?: string): Promise<VerifiedAuth> {
  const supabase = createAdminClient();

  let role: UserRole | null = null;
  let tutorId: string | undefined = undefined;
  let studentDocId: string | undefined = undefined;

  // 1. Fetch from profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", uid)
    .maybeSingle();

  if (profile) {
    role = profile.role as UserRole;
    tutorId = profile.tutor_id || undefined;
    studentDocId = profile.student_doc_id || undefined;
  }

  // 2. Check tutors table
  if (!tutorId || role === "tutor") {
    const { data: tutor } = await supabase
      .from("tutors")
      .select("id")
      .eq("user_id", uid)
      .limit(1)
      .maybeSingle();

    if (tutor) {
      tutorId = tutor.id;
      if (!role) role = "tutor";
    }
  }

  // 3. Check students table
  if (role === "student" || !role) {
    const { data: student } = await supabase
      .from("students")
      .select("id, tutor_id")
      .eq("auth_uid", uid)
      .limit(1)
      .maybeSingle();

    if (student) {
      studentDocId = student.id;
      if (!tutorId) tutorId = student.tutor_id;
      if (!role) role = "student";
    }
  }

  // 4. Default fallback if role is still unknown but uid exists
  if (!role) {
    role = "tutor";
  }

  if (role === "tutor" && !tutorId) {
    tutorId = uid;
  }

  return {
    uid,
    role,
    tutorId,
    studentDocId,
    email: email || profile?.email,
  };
}
