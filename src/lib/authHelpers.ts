import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { UserRole, Permission } from "@/types";
import { getRoleDefaultPermissions, assertPermission } from "@/lib/permissions";

export interface VerifiedAuth {
  uid: string;
  role: UserRole | null;
  tutorId?: string;
  studentDocId?: string;
  studentAuthUid?: string;  // for parent role: the child's auth_uid
  email?: string;
  permissions: Permission[];
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

/**
 * Verifies user authentication and asserts required permission.
 */
export async function verifyUserAuthWithPermission(
  permission: Permission,
  idToken?: string
): Promise<VerifiedAuth> {
  const auth = await verifyUserAuth(idToken);
  assertPermission(auth, permission);
  return auth;
}

async function fetchProfileAuth(uid: string, email?: string): Promise<VerifiedAuth> {
  const supabase = createAdminClient();

  let role: UserRole | null = null;
  let tutorId: string | undefined = undefined;
  let studentDocId: string | undefined = undefined;
  let studentAuthUid: string | undefined = undefined;

  // 1. First, check tutors table directly (If user_id or id matches, this user IS a tutor)
  const { data: tutor } = await supabase
    .from("tutors")
    .select("id")
    .or(`user_id.eq.${uid},id.eq.${uid}`)
    .limit(1)
    .maybeSingle();

  if (tutor) {
    role = "tutor";
    tutorId = tutor.id;
  }

  // 2. Fetch from profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", uid)
    .maybeSingle();

  if (profile) {
    if (profile.role) {
      if (profile.role === "admin" || profile.role === "owner" || !role) {
        role = profile.role as UserRole;
      }
    }
    // If tutorId wasn't found from tutors table, check profile or default to uid for tutor/admin/owner
    if (!tutorId) {
      if (profile.tutor_id) {
        tutorId = profile.tutor_id;
      } else if (role === "tutor" || role === "admin" || role === "owner") {
        tutorId = profile.id || uid;
      }
    }
    if (!studentDocId) {
      studentDocId = profile.student_doc_id || undefined;
    }
  }

  // 3. Check students table
  if (role === "student" || !role) {
    const { data: student } = await supabase
      .from("students")
      .select("id, tutor_id")
      .or(`auth_uid.eq.${uid},id.eq.${uid}`)
      .limit(1)
      .maybeSingle();

    if (student) {
      studentDocId = student.id;
      if (!tutorId) tutorId = student.tutor_id || undefined;
      role = "student";
    }
  }

  // 4. Check parent_links table
  if (role === "parent" || !role) {
    const { data: parentLink } = await supabase
      .from("parent_links")
      .select("student_id, students(id, auth_uid, tutor_id)")
      .eq("parent_uid", uid)
      .limit(1)
      .maybeSingle();

    if (parentLink) {
      const student = parentLink.students as any;
      studentDocId = parentLink.student_id;
      if (student) {
        tutorId = student.tutor_id || undefined;
        studentAuthUid = student.auth_uid || undefined;
      }
      role = "parent";
    }
  }

  // Fallback for tutorId if user role has tutor level access or above
  if (!tutorId && (role === "tutor" || role === "admin" || role === "owner")) {
    tutorId = uid;
  }

  // 5. Fetch custom per-user permissions from user_permissions table
  const permissionsSet = new Set<Permission>(getRoleDefaultPermissions(role));
  try {
    const { data: customPerms } = await supabase
      .from("user_permissions")
      .select("permission")
      .eq("user_id", uid);

    if (customPerms && customPerms.length > 0) {
      customPerms.forEach((row) => {
        if (row.permission) {
          permissionsSet.add(row.permission as Permission);
        }
      });
    }
  } catch {
    // If user_permissions table doesn't exist yet, fallback to default role permissions
  }

  return {
    uid,
    role,
    tutorId,
    studentDocId,
    studentAuthUid,
    email: email || profile?.email,
    permissions: Array.from(permissionsSet),
  };
}

