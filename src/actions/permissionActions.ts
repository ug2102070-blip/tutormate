"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import {
  hasPermission,
  assertPermission,
  getRoleDefaultPermissions,
  getRoleRank,
  hasRoleAtLeast,
} from "@/lib/permissions";
import type { UserRole, Permission } from "@/types";

export interface UserPermissionSummary {
  userId: string;
  displayName: string;
  email: string;
  role: UserRole;
  roleRank: number;
  tutorId?: string;
  studentDocId?: string;
  defaultPermissions: Permission[];
  customPermissions: Permission[];
  effectivePermissions: Permission[];
  createdAt: string;
}

/**
 * Lists all platform users with their assigned roles, default permissions, and custom overrides.
 */
export async function listUsersWithPermissions(
  searchQuery?: string,
  roleFilter?: string
): Promise<{ success: boolean; users?: UserPermissionSummary[]; error?: string }> {
  try {
    const auth = await verifyUserAuth();

    // Require manage_roles permission or admin/owner role
    if (!hasRoleAtLeast(auth.role, "admin") && !hasPermission(auth.role, "manage_roles", auth.permissions)) {
      return { success: false, error: "Access denied: Role Permissions management is restricted to Organization Owners and Administrators." };
    }

    const supabase = createAdminClient();

    // Query profiles table
    let query = supabase
      .from("profiles")
      .select("id, email, display_name, role, tutor_id, student_doc_id, created_at")
      .order("created_at", { ascending: false });

    if (roleFilter && roleFilter !== "all") {
      query = query.eq("role", roleFilter);
    }

    if (searchQuery && searchQuery.trim().length > 0) {
      const q = `%${searchQuery.trim()}%`;
      query = query.or(`display_name.ilike.${q},email.ilike.${q}`);
    }

    const { data: profiles, error: profileErr } = await query;
    if (profileErr) {
      console.error("[listUsersWithPermissions] profiles fetch error:", profileErr);
      return { success: false, error: profileErr.message };
    }

    if (!profiles || profiles.length === 0) {
      return { success: true, users: [] };
    }

    // Fetch custom permissions for all retrieved user IDs
    const userIds = profiles.map((p) => p.id);
    let customPermsMap: Record<string, Permission[]> = {};

    try {
      const { data: customRows } = await supabase
        .from("user_permissions")
        .select("user_id, permission")
        .in("user_id", userIds);

      if (customRows && customRows.length > 0) {
        customRows.forEach((row) => {
          if (!customPermsMap[row.user_id]) {
            customPermsMap[row.user_id] = [];
          }
          if (row.permission) {
            customPermsMap[row.user_id].push(row.permission as Permission);
          }
        });
      }
    } catch {
      // Table might not be created yet in older setups
    }

    const users: UserPermissionSummary[] = profiles.map((p) => {
      const role = (p.role || "student") as UserRole;
      const roleRank = getRoleRank(role);
      const defaultPerms = getRoleDefaultPermissions(role);
      const customPerms = customPermsMap[p.id] || [];

      const effectiveSet = new Set<Permission>([...defaultPerms, ...customPerms]);

      return {
        userId: p.id,
        displayName: p.display_name || p.email?.split("@")[0] || "User",
        email: p.email || "",
        role,
        roleRank,
        tutorId: p.tutor_id || undefined,
        studentDocId: p.student_doc_id || undefined,
        defaultPermissions: defaultPerms,
        customPermissions: customPerms,
        effectivePermissions: Array.from(effectiveSet),
        createdAt: p.created_at || new Date().toISOString(),
      };
    });

    return { success: true, users };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to list users and permissions." };
  }
}

/**
 * Updates a target user's role tier in profiles table.
 */
export async function updateUserRole(
  targetUserId: string,
  newRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyUserAuth();

    // Require manage_roles permission or admin/owner role
    assertPermission(auth, "manage_roles");

    // Check rank hierarchy: cannot set a role higher than caller's own rank
    const callerRank = getRoleRank(auth.role);
    const newRoleRank = getRoleRank(newRole);

    if (callerRank < 5 && newRoleRank >= callerRank) {
      return {
        success: false,
        error: `Cannot assign role '${newRole}' which is equal to or higher than your role rank.`,
      };
    }

    const supabase = createAdminClient();

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", targetUserId);

    if (updateErr) {
      console.error("[updateUserRole] Error updating role:", updateErr);
      return { success: false, error: updateErr.message };
    }

    // If new role is tutor, ensure entry exists in tutors table
    if (newRole === "tutor" || newRole === "owner" || newRole === "admin") {
      const { data: existingTutor } = await supabase
        .from("tutors")
        .select("id")
        .eq("id", targetUserId)
        .maybeSingle();

      if (!existingTutor) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, email, phone_number")
          .eq("id", targetUserId)
          .maybeSingle();

        await supabase.from("tutors").upsert({
          id: targetUserId,
          user_id: targetUserId,
          full_name: profile?.display_name || profile?.email?.split("@")[0] || "Tutor",
          institution: "Coaching Center",
          contact_phone: profile?.phone_number || "",
        });
      }
    }

    revalidatePath("/tutor/permissions");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update user role." };
  }
}

/**
 * Grants an explicit custom override permission to a target user.
 */
export async function grantCustomPermission(
  targetUserId: string,
  permission: Permission
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyUserAuth();
    assertPermission(auth, "manage_roles");

    const supabase = createAdminClient();

    const { error: insertErr } = await supabase.from("user_permissions").upsert(
      {
        user_id: targetUserId,
        permission,
        granted_by: auth.uid,
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id,permission" }
    );

    if (insertErr) {
      console.error("[grantCustomPermission] Error inserting custom permission:", insertErr);
      return { success: false, error: insertErr.message };
    }

    revalidatePath("/tutor/permissions");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to grant custom permission." };
  }
}

/**
 * Revokes an explicit custom override permission from a target user.
 */
export async function revokeCustomPermission(
  targetUserId: string,
  permission: Permission
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyUserAuth();
    assertPermission(auth, "manage_roles");

    const supabase = createAdminClient();

    const { error: deleteErr } = await supabase
      .from("user_permissions")
      .delete()
      .eq("user_id", targetUserId)
      .eq("permission", permission);

    if (deleteErr) {
      console.error("[revokeCustomPermission] Error revoking custom permission:", deleteErr);
      return { success: false, error: deleteErr.message };
    }

    revalidatePath("/tutor/permissions");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to revoke custom permission." };
  }
}
