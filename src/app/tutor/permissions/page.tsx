"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  UserCheck,
  Crown,
  Key,
  CheckCircle2,
  XCircle,
  Sparkles,
  Sliders,
  ChevronDown,
  Info,
  RefreshCw,
} from "lucide-react";
import {
  listUsersWithPermissions,
  updateUserRole,
  grantCustomPermission,
  revokeCustomPermission,
  type UserPermissionSummary,
} from "@/actions/permissionActions";
import {
  ROLE_RANKS,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_METADATA,
} from "@/lib/permissions";
import type { UserRole, Permission } from "@/types";

export default function RolePermissionsPage() {
  const [users, setUsers] = useState<UserPermissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserPermissionSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    const res = await listUsersWithPermissions(searchQuery, roleFilter);
    if (res.success && res.users) {
      setUsers(res.users);
      if (selectedUser) {
        const updated = res.users.find((u) => u.userId === selectedUser.userId);
        if (updated) setSelectedUser(updated);
      }
    } else {
      setError(res.error || "Failed to load users");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setActionLoading(userId);
    const res = await updateUserRole(userId, newRole);
    if (res.success) {
      showToast(`User role updated to ${newRole.toUpperCase()} successfully.`);
      await fetchUsers();
    } else {
      showToast(res.error || "Failed to update role", "error");
    }
    setActionLoading(null);
  };

  const handleTogglePermission = async (userId: string, permission: Permission, isCustom: boolean) => {
    setActionLoading(`${userId}-${permission}`);
    let res;
    if (isCustom) {
      res = await revokeCustomPermission(userId, permission);
      if (res.success) showToast(`Revoked custom permission '${permission}'`);
    } else {
      res = await grantCustomPermission(userId, permission);
      if (res.success) showToast(`Granted custom permission '${permission}'`);
    }

    if (!res.success) {
      showToast(res.error || "Permission update failed", "error");
    } else {
      await fetchUsers();
    }
    setActionLoading(null);
  };

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case "owner":
        return { bg: "rgba(234, 179, 8, 0.15)", text: "#eab308", border: "rgba(234, 179, 8, 0.3)" };
      case "admin":
        return { bg: "rgba(168, 85, 247, 0.15)", text: "#a855f7", border: "rgba(168, 85, 247, 0.3)" };
      case "tutor":
        return { bg: "rgba(59, 130, 246, 0.15)", text: "#3b82f6", border: "rgba(59, 130, 246, 0.3)" };
      case "parent":
        return { bg: "rgba(236, 72, 153, 0.15)", text: "#ec4899", border: "rgba(236, 72, 153, 0.3)" };
      case "student":
      default:
        return { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981", border: "rgba(16, 185, 129, 0.3)" };
    }
  };

  const rolesList: UserRole[] = ["student", "parent", "tutor", "admin", "owner"];
  const allPermissionsList = Object.keys(PERMISSION_METADATA) as Permission[];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Toast Banner */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border shadow-lg flex items-center gap-3 text-sm font-semibold transition-all ${
            toastMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
          }`}
        >
          {toastMessage.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {toastMessage.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="p-2 rounded-xl text-primary"
              style={{ background: "var(--color-primary-50)" }}
            >
              <Key className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight">Role Permissions Engine</h1>
          </div>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            Configure user role hierarchies, default capabilities matrix, and custom per-user permission overrides.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border transition-all hover:bg-black/5 dark:hover:bg-white/5"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Engine
        </button>
      </div>

      {/* Section 1: Role Ranks & Capabilities Hierarchy Card */}
      <div
        className="p-6 rounded-2xl border space-y-4"
        style={{
          background: "var(--color-card-bg)",
          borderColor: "var(--color-card-border)",
        }}
      >
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold">5-Tier Role Hierarchy & Capabilities Matrix</h2>
        </div>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Permissions scale hierarchically from Student (Rank 1) to Owner (Rank 5). Higher rank roles inherit operational capabilities.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {rolesList.map((r) => {
            const badge = getRoleBadgeStyle(r);
            const rank = ROLE_RANKS[r];
            const defaultPerms = DEFAULT_ROLE_PERMISSIONS[r];

            return (
              <div
                key={r}
                className="p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all hover:scale-[1.02]"
                style={{
                  background: "var(--color-bg)",
                  borderColor: "var(--color-border)",
                }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs uppercase font-extrabold px-2.5 py-0.5 rounded-full border"
                      style={{
                        background: badge.bg,
                        color: badge.text,
                        borderColor: badge.border,
                      }}
                    >
                      {r}
                    </span>
                    <span className="text-[11px] font-semibold text-gray-500">
                      Rank {rank}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Capabilities ({defaultPerms.length})
                    </span>
                    <ul className="text-xs space-y-1">
                      {defaultPerms.map((p) => (
                        <li key={p} className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate">{PERMISSION_METADATA[p]?.label || p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: User Roles & Permission Overrides List */}
      <div
        className="p-6 rounded-2xl border space-y-6"
        style={{
          background: "var(--color-card-bg)",
          borderColor: "var(--color-card-border)",
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-500" />
              Platform Users & Permission Management
            </h2>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              View and assign user roles or grant granular override permissions per account.
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
              />
            </form>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border bg-transparent focus:outline-none font-semibold cursor-pointer"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
            >
              <option value="all" className="dark:bg-gray-800">All Roles</option>
              <option value="student" className="dark:bg-gray-800">Student</option>
              <option value="parent" className="dark:bg-gray-800">Parent</option>
              <option value="tutor" className="dark:bg-gray-800">Tutor</option>
              <option value="admin" className="dark:bg-gray-800">Admin</option>
              <option value="owner" className="dark:bg-gray-800">Owner</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="py-12 flex justify-center items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
              Loading platform permissions...
            </span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            {error}
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
            No users match the specified search query or role filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                  <th className="py-3 px-4 font-semibold text-xs text-gray-500 uppercase">User</th>
                  <th className="py-3 px-4 font-semibold text-xs text-gray-500 uppercase">Current Role</th>
                  <th className="py-3 px-4 font-semibold text-xs text-gray-500 uppercase">Rank</th>
                  <th className="py-3 px-4 font-semibold text-xs text-gray-500 uppercase">Effective Permissions</th>
                  <th className="py-3 px-4 font-semibold text-xs text-gray-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                {users.map((u) => {
                  const badge = getRoleBadgeStyle(u.role);
                  const isUpdatingRole = actionLoading === u.userId;

                  return (
                    <tr key={u.userId} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      {/* User Info */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm"
                            style={{ background: badge.text }}
                          >
                            {u.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold">{u.displayName}</div>
                            <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                              {u.email || u.userId}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Current Role Dropdown Selector */}
                      <td className="py-4 px-4">
                        <div className="relative inline-block">
                          <select
                            value={u.role}
                            disabled={isUpdatingRole}
                            onChange={(e) => handleRoleChange(u.userId, e.target.value as UserRole)}
                            className="appearance-none font-bold text-xs uppercase px-3 py-1.5 pr-7 rounded-lg border cursor-pointer focus:outline-none transition-all"
                            style={{
                              background: badge.bg,
                              color: badge.text,
                              borderColor: badge.border,
                            }}
                          >
                            {rolesList.map((r) => (
                              <option key={r} value={r} className="dark:bg-gray-800 text-gray-800 dark:text-white">
                                {r.toUpperCase()}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: badge.text }} />
                        </div>
                      </td>

                      {/* Rank Indicator */}
                      <td className="py-4 px-4 font-semibold text-xs text-gray-500">
                        Rank {u.roleRank}
                      </td>

                      {/* Effective Permissions Count & Custom Badges */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-600 dark:text-gray-300">
                            {u.effectivePermissions.length} Active
                          </span>

                          {u.customPermissions.length > 0 && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-500 border border-purple-500/30 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              +{u.customPermissions.length} Custom Overrides
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action: Manage Overrides */}
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setIsModalOpen(true);
                          }}
                          className="px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 ml-auto transition-all hover:bg-primary hover:text-white"
                          style={{ borderColor: "var(--color-border)" }}
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          Manage Overrides
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Permission Overrides Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-2xl rounded-2xl border p-6 space-y-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            style={{
              background: "var(--color-card-bg)",
              borderColor: "var(--color-card-border)",
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--color-border)" }}>
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-primary" />
                  Granular Permission Overrides
                </h3>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  User: <span className="font-bold text-gray-900 dark:text-white">{selectedUser.displayName}</span> ({selectedUser.email || selectedUser.userId}) — Role: <span className="font-bold uppercase text-primary">{selectedUser.role}</span>
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Permissions marked <b>Inherited</b> are granted automatically by the user's role ({selectedUser.role.toUpperCase()}). You can grant or revoke additional <b>Custom Overrides</b> below.
                </span>
              </div>

              <div className="space-y-2 pt-2">
                {allPermissionsList.map((perm) => {
                  const meta = PERMISSION_METADATA[perm];
                  const isDefault = selectedUser.defaultPermissions.includes(perm);
                  const isCustom = selectedUser.customPermissions.includes(perm);
                  const isEffective = selectedUser.effectivePermissions.includes(perm);
                  const isUpdating = actionLoading === `${selectedUser.userId}-${perm}`;

                  return (
                    <div
                      key={perm}
                      className="p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-all"
                      style={{
                        background: isCustom ? "rgba(168, 85, 247, 0.08)" : "var(--color-bg)",
                        borderColor: isCustom ? "rgba(168, 85, 247, 0.3)" : "var(--color-border)",
                      }}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{meta?.label || perm}</span>
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-500">
                            {meta?.category || "General"}
                          </span>
                          {isDefault && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">
                              Inherited ({selectedUser.role})
                            </span>
                          )}
                          {isCustom && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-500 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Custom Granted
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                          {meta?.description}
                        </p>
                      </div>

                      {/* Toggle Button */}
                      <div>
                        {isDefault ? (
                          <div className="px-3 py-1.5 text-xs font-semibold text-emerald-500 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Enabled
                          </div>
                        ) : (
                          <button
                            disabled={isUpdating}
                            onClick={() => handleTogglePermission(selectedUser.userId, perm, isCustom)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 ${
                              isCustom
                                ? "bg-purple-600 text-white border-purple-600 hover:bg-purple-700"
                                : "hover:bg-black/5 dark:hover:bg-white/5 border-gray-300 dark:border-gray-700"
                            }`}
                          >
                            {isUpdating ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : isCustom ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" /> Granted (Revoke)
                              </>
                            ) : (
                              <>
                                <Key className="w-3.5 h-3.5" /> Grant Override
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t pt-4 flex justify-end" style={{ borderColor: "var(--color-border)" }}>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 text-sm font-bold rounded-xl bg-primary text-white hover:opacity-90 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
