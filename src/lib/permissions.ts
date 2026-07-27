import type { UserRole, Permission } from "@/types";

/**
 * Ascending role rank hierarchy.
 * student (1) < parent (2) < tutor (3) < admin (4) < owner (5)
 */
export const ROLE_RANKS: Record<UserRole, number> = {
  student: 1,
  parent: 2,
  tutor: 3,
  admin: 4,
  owner: 5,
};

/**
 * Standard permissions matrix assigned by role.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  student: ["read_own_data"],
  parent: ["read_own_data"],
  tutor: ["read_own_data", "write_own_batch", "view_analytics"],
  admin: [
    "read_own_data",
    "write_own_batch",
    "read_all_batches",
    "manage_tutors",
    "manage_billing",
    "manage_center",
    "view_analytics",
    "manage_users",
    "manage_roles",
  ],
  owner: [
    "read_own_data",
    "write_own_batch",
    "read_all_batches",
    "manage_tutors",
    "manage_billing",
    "manage_center",
    "view_analytics",
    "manage_users",
    "manage_roles",
  ],
};

/**
 * Human-readable titles and descriptions for each permission.
 */
export const PERMISSION_METADATA: Record<
  Permission,
  { label: string; description: string; category: string }
> = {
  read_own_data: {
    label: "Read Own Data",
    description: "Access personal profile, assignments, and relevant records.",
    category: "General",
  },
  write_own_batch: {
    label: "Manage Own Batches",
    description: "Create, edit, and update student records and materials in owned batches.",
    category: "Tutor",
  },
  read_all_batches: {
    label: "Read All Center Batches",
    description: "View batches and schedules across all center tutors.",
    category: "Coaching",
  },
  manage_tutors: {
    label: "Manage Tutors",
    description: "Invite, assign, and configure center tutors.",
    category: "Coaching",
  },
  manage_billing: {
    label: "Manage Billing & Fees",
    description: "Access financial ledgers, revenue stats, and subscription billing.",
    category: "Admin",
  },
  manage_center: {
    label: "Manage Coaching Center",
    description: "Modify institution profile, join code, and organization branding.",
    category: "Coaching",
  },
  view_analytics: {
    label: "View Analytics",
    description: "View performance charts, attendance trends, and income reports.",
    category: "Analytics",
  },
  manage_users: {
    label: "Manage Users",
    description: "Moderate students, tutors, and user registrations.",
    category: "Admin",
  },
  manage_roles: {
    label: "Manage Roles & Engine",
    description: "Change user role tiers and assign custom granular permission overrides.",
    category: "Admin",
  },
};

/**
 * Returns numeric rank for a given role (0 if null/invalid).
 */
export function getRoleRank(role: UserRole | null | undefined): number {
  if (!role || !(role in ROLE_RANKS)) return 0;
  return ROLE_RANKS[role];
}

/**
 * Compares user role against required minimum role tier.
 */
export function hasRoleAtLeast(
  userRole: UserRole | null | undefined,
  minRole: UserRole
): boolean {
  return getRoleRank(userRole) >= getRoleRank(minRole);
}

/**
 * Gets standard default permissions array for a given role.
 */
export function getRoleDefaultPermissions(
  role: UserRole | null | undefined
): Permission[] {
  if (!role || !(role in DEFAULT_ROLE_PERMISSIONS)) return [];
  return DEFAULT_ROLE_PERMISSIONS[role];
}

/**
 * Evaluates whether a user role (with optional custom permissions) holds a given permission.
 */
export function hasPermission(
  role: UserRole | null | undefined,
  permission: Permission,
  customPermissions?: Permission[]
): boolean {
  if (!role) return false;
  
  // Custom user override permissions take priority
  if (customPermissions && customPermissions.includes(permission)) {
    return true;
  }

  const defaults = getRoleDefaultPermissions(role);
  return defaults.includes(permission);
}

/**
 * Asserts permission requirement and throws Error if unpermitted.
 */
export function assertPermission(
  auth: { role: UserRole | null; permissions?: Permission[] },
  permission: Permission
): void {
  if (!hasPermission(auth.role, permission, auth.permissions)) {
    const permMeta = PERMISSION_METADATA[permission];
    const permLabel = permMeta ? permMeta.label : permission;
    throw new Error(
      `Permission denied: You do not have permission '${permLabel}' (${permission}).`
    );
  }
}
