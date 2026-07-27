"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Settings, ChevronDown, User } from "lucide-react";
import { HeaderCalendar } from "@/components/HeaderCalendar";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";

export function Header() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    document.cookie =
      "__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  }

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.displayName ||
    user?.email?.split("@")[0] ||
    "User";

  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  return (
    <header
      className="h-14 px-4 md:px-6 flex items-center justify-between shrink-0 z-20 relative sticky top-0 backdrop-blur-xl"
      style={{
        background: "var(--color-header-bg)",
        borderBottom: "1px solid var(--color-header-border)",
      }}
    >
      {/* Left: Brand (mobile) / Portal title (desktop) */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/"
            className="text-base font-black tracking-tight"
            style={{ color: "var(--color-primary)" }}
          >
            TutorMate
          </Link>
          <span
            className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full border"
            style={{
              background: "var(--color-primary-50)",
              color: "var(--color-primary)",
              borderColor: "var(--color-primary-100)",
            }}
          >
            {role}
          </span>
        </div>

        <h2
          className="hidden md:block text-sm font-bold capitalize tracking-wide"
          style={{ color: "var(--color-text)" }}
        >
          {role} Portal
        </h2>
      </div>

      {/* Right: Calendar + Notifications + User */}
      <div className="flex items-center gap-2 relative">
        {/* Calendar Widget — only on desktop */}
        <div className="hidden md:block">
          {role && <HeaderCalendar role={role as "tutor" | "student"} />}
        </div>

        {/* Language Toggle */}
        <LanguageToggle />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notification Bell */}
        <NotificationBell />

        {/* User Avatar Button */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 p-1 rounded-xl transition-all active:scale-95"
          style={{
            border: "1px solid transparent",
          }}
          aria-expanded={showMenu}
          aria-label="User account menu"
          id="header-user-btn"
        >
          {/* Avatar Circle */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold border shrink-0"
            style={{
              background: "var(--color-primary-50)",
              color: "var(--color-primary)",
              borderColor: "var(--color-primary-100)",
            }}
          >
            {initials || <User className="w-4 h-4" />}
          </div>

          {/* Name — only on larger screens */}
          <div className="hidden sm:block text-left">
            <div
              className="text-xs font-bold leading-tight"
              style={{ color: "var(--color-text)" }}
            >
              {displayName}
            </div>
            <div
              className="text-[10px] leading-tight"
              style={{ color: "var(--color-text-muted)" }}
            >
              {user?.email}
            </div>
          </div>

          <ChevronDown
            className="w-3.5 h-3.5"
            style={{
              color: "var(--color-text-muted)",
              transform: showMenu ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />

            {/* Menu Panel */}
            <div
              className="absolute right-0 top-11 w-52 rounded-2xl py-1.5 z-50 animate-scale-in"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-elevated)",
              }}
            >
              {/* Mobile user info */}
              <div
                className="px-3 py-2.5 sm:hidden"
                style={{
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <div
                  className="text-xs font-bold"
                  style={{ color: "var(--color-text)" }}
                >
                  {displayName}
                </div>
                <div
                  className="text-[10px] truncate font-medium mt-0.5"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {user?.email}
                </div>
              </div>

              {/* Settings link (tutor only) */}
              {role === "tutor" && (
                <Link
                  href="/tutor/settings"
                  onClick={() => setShowMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors"
                  style={{ color: "var(--color-text-secondary)" }}
                  id="header-settings-link"
                >
                  <Settings
                    className="w-4 h-4"
                    style={{ color: "var(--color-text-muted)" }}
                  />
                  Account Settings
                </Link>
              )}

              {/* Logout button */}
              <button
                onClick={() => {
                  setShowMenu(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-left transition-colors"
                style={{ color: "var(--color-error)" }}
                id="header-logout-btn"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
