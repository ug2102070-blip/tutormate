"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/config";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User } from "lucide-react";

export function Header() {
  const router = useRouter();
  const { user, role } = useAuth();

  async function handleLogout() {
    await signOut(auth);
    // Clear session cookie
    document.cookie = "__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  }

  return (
    <header
      className="h-16 border-b px-6 flex items-center justify-between shrink-0 transition-colors duration-200"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flex items-center gap-3">
        <h2
          className="text-sm font-semibold capitalize"
          style={{ color: "var(--color-text)" }}
        >
          {role} Portal
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* User Info */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              backgroundColor: "var(--color-primary-100)",
              color: "var(--color-primary-900)",
            }}
          >
            {user?.displayName ? (
              user.displayName.charAt(0).toUpperCase()
            ) : (
              <User className="w-4 h-4" />
            )}
          </div>
          <div className="hidden sm:block text-left">
            <div
              className="text-xs font-semibold"
              style={{ color: "var(--color-text)" }}
            >
              {user?.displayName || "User"}
            </div>
            <div
              className="text-[11px]"
              style={{ color: "var(--color-text-muted)" }}
            >
              {user?.email}
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
          style={{
            color: "var(--color-text-secondary)",
          }}
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
