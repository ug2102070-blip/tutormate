import { cache } from "react";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { UserRole, Permission } from "@/types";
import { getRoleDefaultPermissions, assertPermission } from "@/lib/permissions";
import type { User } from "@supabase/supabase-js";

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
 * Verifies user authentication using Supabase cookies or cryptographically signed JWT token.
 * Security Note: Raw unauthenticated user UIDs are rejected to prevent identity spoofing.
 */
// React.cache() ensures this function only runs ONCE per request,
// even if called by multiple Server Actions in parallel (e.g., dashboard).
// This eliminates ~20 redundant DB queries per dashboard load.
export const verifyUserAuth = cache(async (idToken?: string): Promise<VerifiedAuth> => {
  const adminSupabase = createAdminClient();

  // 1. Try verifying via server cookies first (most reliable in Next.js Server Actions)
  try {
    const serverSupabase = await createClient();
    const cookieRes = await serverSupabase.auth.getUser();
    const cookieUser = cookieRes?.data?.user;
    if (cookieUser && !cookieRes.error) {
      return await fetchProfileAuth(
        cookieUser.id,
        cookieUser.email,
        cookieUser.app_metadata,
        cookieUser.user_metadata
      );
    }
  } catch {
    // Ignore error if cookie context isn't available or fails
  }

  // 2. If idToken is a cryptographically signed JWT token (contains dots), verify with Supabase Auth
  if (idToken && typeof idToken === "string" && idToken.includes(".")) {
    try {
      const tokenRes = await adminSupabase.auth.getUser(idToken);
      const user = tokenRes?.data?.user;
      if (user && !tokenRes.error) {
        return await fetchProfileAuth(
          user.id,
          user.email,
          user.app_metadata,
          user.user_metadata
        );
      }
    } catch {
      // Token verification failed
    }
  }

  throw new Error("Invalid or expired authentication token");
});

/**
 * Verifies user authentication and asserts required permission.
 */
// Also cached — shares the same auth result when called in parallel
export const verifyUserAuthWithPermission = cache(async (
  permission: Permission,
  idToken?: string
): Promise<VerifiedAuth> => {
  const auth = await verifyUserAuth(idToken);
  assertPermission(auth, permission);
  return auth;
});

async function fetchProfileAuth(
  uid: string,
  email?: string,
  appMetadata?: Record<string, any>,
  userMetadata?: Record<string, any>
): Promise<VerifiedAuth> {
  // 1. Zero-Latency Path: Check JWT Custom Claims (app_metadata)
  // This is the fastest path and requires NO database hits.
  if (appMetadata?.role) {
    const role = appMetadata.role as UserRole;
    const permissionsSet = new Set<Permission>(getRoleDefaultPermissions(role));

    return {
      uid,
      role: role,
      tutorId: appMetadata.tutorId,
      studentDocId: appMetadata.studentDocId || appMetadata.studentId,
      studentAuthUid: appMetadata.studentAuthUid,
      email: email,
      permissions: Array.from(permissionsSet),
    };
  }

  const supabase = createAdminClient();

  // 2. Database Path: Single RPC call (cached if possible by DB)
  const { data, error } = await supabase.rpc("get_user_auth_context", {
    p_uid: uid,
  });

  if (error || !data || !data.role) {
    // 3. Fallback Path: Public User Metadata (less secure, used during provisioning)
    if (userMetadata?.role) {
      const role = userMetadata.role as UserRole;
      const permissionsSet = new Set<Permission>(getRoleDefaultPermissions(role));

      return {
        uid,
        role: role,
        tutorId: userMetadata.tutorId,
        studentDocId: userMetadata.studentDocId || userMetadata.studentId,
        studentAuthUid: userMetadata.studentAuthUid,
        email: email,
        permissions: Array.from(permissionsSet),
      };
    }

    // Ultimate fallback
    return {
      uid,
      role: null,
      permissions: [],
      email: email,
    };
  }

  // Combine RPC permissions with default role permissions
  const role = data.role as UserRole;
  const permissionsSet = new Set<Permission>(getRoleDefaultPermissions(role));

  if (Array.isArray(data.permissions)) {
    data.permissions.forEach((p: string) => permissionsSet.add(p as Permission));
  }

  return {
    uid: data.uid || uid,
    role: role,
    tutorId: data.tutorId,
    studentDocId: data.studentDocId,
    studentAuthUid: data.studentAuthUid,
    email: data.email || email,
    permissions: Array.from(permissionsSet),
  };
}

